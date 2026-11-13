"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import GuitarNeck from "@/components/instruments/GuitarNeck"
import { get, getApiBaseUrl } from "@/lib/api"
import { Playback, playStrums } from "@/lib/audio/synth"
import {
  EMPTY_SHAPE,
  Shape,
  Voicing,
  chordVoicings,
  compareShapes,
  formatShape,
  identifyShape,
  intervalLabel,
  nearestVoicing,
  noteName,
  parseShape,
  shapeMidis,
} from "@/lib/music/guitar"
import { NOTE_OFFSETS, categoryColor, connectionLabel, findCompatibleChords } from "@/lib/music/theory"
import { Chord, ConnectionsResponse } from "@/types"

type Step = { name: string; chordId: string; shape: Shape }
type NextOption = { chord: Chord; score: number; category: string; voicing: Voicing & { move: ReturnType<typeof compareShapes> } }

const START_SHAPE = parseShape("x32010")!

export default function FretboardPage() {
  return (
    <Suspense>
      <Fretboard />
    </Suspense>
  )
}

function Fretboard() {
  const searchParams = useSearchParams()
  const [shape, setShape] = useState<Shape>(() => parseShape(searchParams.get("forma") ?? "") ?? START_SHAPE)
  const [shapeText, setShapeText] = useState(() => formatShape(shape))
  const [readingIndex, setReadingIndex] = useState(0)
  const [labels, setLabels] = useState<"notes" | "intervals">("notes")
  const [showMap, setShowMap] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"score" | "hand">("score")
  const [trail, setTrail] = useState<Step[]>([])
  const [search, setSearch] = useState("")
  const [playing, setPlaying] = useState<string | null>(null)
  const playback = useRef<Playback | null>(null)
  const voicingCache = useRef(new Map<string, Voicing[]>())

  const { data: chords = [], isLoading, error } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const chordById = useMemo(() => new Map(chords.map(chord => [chord.id, chord])), [chords])

  const voicingsOf = (chord: Chord) => {
    const cached = voicingCache.current.get(chord.id)
    if (cached) return cached
    const voicings = chordVoicings(chord)
    voicingCache.current.set(chord.id, voicings)
    return voicings
  }

  const readings = useMemo(() => identifyShape(shape, chords), [shape, chords])
  const reading = readings[readingIndex] ?? readings[0] ?? null
  const current = reading?.chord ?? null
  const rootPc = current ? NOTE_OFFSETS[current.root] : null
  const soundingPcs = useMemo(() => Array.from(new Set(shapeMidis(shape).map(midi => midi % 12))), [shape])

  // Keep the shape in the URL so a voicing can be shared or bookmarked.
  useEffect(() => {
    setShapeText(formatShape(shape))
    setReadingIndex(0)
    const url = new URL(window.location.href)
    url.searchParams.set("forma", formatShape(shape))
    window.history.replaceState(null, "", url)
  }, [shape])

  useEffect(() => () => playback.current?.stop(), [])

  const { data: connectionsData, isFetching: connectionsLoading } = useQuery<ConnectionsResponse>({
    queryKey: ["instrument-connections", current?.id],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${encodeURIComponent(current!.id)}/connections`, { min_score: 0, max_results: 14 }),
    enabled: !!current,
  })

  const nextOptions = useMemo<NextOption[]>(() => {
    const options = (connectionsData?.connections ?? []).flatMap(connection => {
      const chord = chordById.get(connection.target)
      if (!chord) return []
      const voicing = nearestVoicing(shape, voicingsOf(chord))
      return voicing ? [{ chord, score: connection.score, category: connection.category, voicing }] : []
    })
    const sorted =
      sortBy === "hand"
        ? [...options].sort((a, b) => a.voicing.move.slide * 2 + a.voicing.move.moved - (b.voicing.move.slide * 2 + b.voicing.move.moved) || b.score - a.score)
        : options
    return sorted.slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionsData, chordById, shape, sortBy])

  const otherVoicings = current ? voicingsOf(current) : []
  const previewShape = preview ? (nextOptions.find(option => option.chord.id === preview)?.voicing.shape ?? null) : null
  const compatible = useMemo(
    () => (readings.length || soundingPcs.length < 2 ? [] : findCompatibleChords(chords, soundingPcs.map(noteName)).slice(0, 5)),
    [readings, soundingPcs, chords],
  )

  function play(id: string, shapes: Shape[]) {
    playback.current?.stop()
    if (playing === id) {
      setPlaying(null)
      return
    }
    setPlaying(id)
    playback.current = playStrums(
      shapes.map(item => shapeMidis(item)),
      { onStep: index => index === null && setPlaying(null) },
    )
  }

  function applyText() {
    const parsed = parseShape(shapeText)
    if (parsed) setShape(parsed)
    else setShapeText(formatShape(shape))
  }

  function goTo(option: NextOption) {
    if (reading) setTrail(steps => [...steps, { name: reading.name, chordId: reading.chord.id, shape }])
    setShape(option.voicing.shape)
    setPreview(null)
  }

  function undo() {
    const last = trail[trail.length - 1]
    if (!last) return
    setTrail(steps => steps.slice(0, -1))
    setShape(last.shape)
  }

  function loadChord(id: string) {
    const chord = chordById.get(id.trim())
    if (!chord) return false
    const voicing = nearestVoicing(shape, voicingsOf(chord)) ?? null
    if (voicing) setShape(voicing.shape)
    return !!voicing
  }

  const journey = [...trail, ...(reading ? [{ name: reading.name, chordId: reading.chord.id, shape }] : [])]

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
        <section className="max-w-lg rounded-lg border border-hairline bg-canvas p-8 text-center shadow-sm">
          <h1 className="text-[28px] text-ink">No se pudo conectar con la API</h1>
          <p className="mt-3 text-sm text-ink-mute">Verifica que el backend esté corriendo en {getApiBaseUrl()}.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas-soft text-ink">
      <section className="thread-bg text-on-primary">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-surface-violet-soft">Mástil</p>
          <h1 className="mt-3 max-w-3xl text-[36px] leading-[1.02] md:text-[54px]">Pon los dedos. Te decimos qué acorde es y adónde ir después.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-dark-mute">
            Arma la forma en el mástil (o escríbela como <span className="font-mono text-on-primary">x32010</span>). ChordWeaver la nombra, te muestra dónde más
            tocarla y qué acorde sigue con el menor movimiento de tu mano.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-3 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-hairline bg-canvas p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">
                Forma
                <input
                  value={shapeText}
                  onChange={event => setShapeText(event.target.value)}
                  onBlur={applyText}
                  onKeyDown={event => event.key === "Enter" && applyText()}
                  spellCheck={false}
                  aria-describedby="shape-help"
                  className="min-h-11 w-44 rounded-md border border-hairline bg-canvas px-3 font-mono text-lg normal-case tracking-normal text-ink outline-none focus:border-ink"
                />
              </label>
              <form
                className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute"
                onSubmit={event => {
                  event.preventDefault()
                  if (loadChord(search)) setSearch("")
                }}
              >
                <label htmlFor="chord-search">¿Cómo se toca…?</label>
                <span className="flex gap-1">
                  <input
                    id="chord-search"
                    list="chord-ids"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="F#m7"
                    className="min-h-11 w-28 rounded-md border border-hairline bg-canvas px-3 font-mono text-base normal-case tracking-normal text-ink outline-none focus:border-ink"
                  />
                  <button
                    type="submit"
                    className="min-h-11 rounded-md border border-ink/30 px-3 text-sm font-bold normal-case tracking-normal text-ink hover:border-ink"
                  >
                    Buscar
                  </button>
                </span>
                <datalist id="chord-ids">
                  {chords.map(chord => (
                    <option key={chord.id} value={chord.id} />
                  ))}
                </datalist>
              </form>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => play("current", [shape])}
                  disabled={soundingPcs.length === 0}
                  className="min-h-11 rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-50"
                >
                  {playing === "current" ? "■ Detener" : "▶ Rasguear"}
                </button>
                <button
                  type="button"
                  onClick={() => setShape([...EMPTY_SHAPE])}
                  className="min-h-11 rounded-md border border-hairline px-4 font-semibold hover:border-ink"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <p id="shape-help" className="mt-2 text-xs text-ink-mute">
              De la 6.ª cuerda (Mi grave) a la 1.ª: <span className="font-mono">x</span> apagada, <span className="font-mono">0</span> al aire. Trastes de dos
              cifras con guiones: <span className="font-mono">x-10-12-12-11-10</span>.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <div role="radiogroup" aria-label="Etiquetas" className="flex rounded-md border border-hairline p-0.5">
                {(["notes", "intervals"] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={labels === value}
                    onClick={() => setLabels(value)}
                    className={`min-h-8 rounded px-3 font-semibold ${labels === value ? "bg-ink text-canvas" : "text-ink-mute"}`}
                  >
                    {value === "notes" ? "Notas" : "Intervalos"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={showMap}
                onClick={() => setShowMap(value => !value)}
                disabled={!current}
                className={`min-h-9 rounded-md border px-3 font-semibold disabled:opacity-50 ${showMap ? "border-ink bg-ink text-canvas" : "border-hairline text-ink-mute hover:border-ink/40"}`}
              >
                {current ? `Ver ${current.id} en todo el mástil` : "Ver el acorde en todo el mástil"}
              </button>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="h-[340px] animate-pulse rounded-lg bg-hairline/50" />
              ) : (
                <GuitarNeck
                  shape={shape}
                  onChange={setShape}
                  ghost={previewShape}
                  rootPc={rootPc}
                  chordType={current?.type}
                  labels={labels}
                  mapTones={showMap && current ? new Set((current.notes ?? current.triad).map(note => NOTE_OFFSETS[note])) : null}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-ink-mute">
              Toca un traste para poner el dedo (otra vez para quitarlo). Toca el nombre de la cuerda para alternar entre al aire ○ y apagada ×.
              {previewShape ? " Punteado verde: dónde irían los dedos; anillo verde: el dedo se queda." : ""}
            </p>
          </div>

          {current && otherVoicings.length > 1 ? (
            <section className="rounded-xl border border-hairline bg-canvas p-4 shadow-card sm:p-5" aria-labelledby="voicings-title">
              <h2 id="voicings-title" className="font-display text-2xl">
                Dónde más tocar {current.id}
              </h2>
              <p className="mt-1 text-sm text-ink-mute">
                Digitaciones con la fundamental en el bajo, de la cejuela hacia el traste {otherVoicings[otherVoicings.length - 1].position}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {otherVoicings.map(voicing => {
                  const active = formatShape(voicing.shape) === formatShape(shape)
                  return (
                    <span
                      key={formatShape(voicing.shape)}
                      className={`flex items-center rounded-md border ${active ? "border-ink bg-ink text-canvas" : "border-hairline"}`}
                    >
                      <button type="button" onClick={() => setShape(voicing.shape)} aria-pressed={active} className="min-h-10 px-3 text-left">
                        <span className="block font-mono text-sm font-bold">{formatShape(voicing.shape)}</span>
                        <span className={`block text-[11px] ${active ? "text-on-dark-mute" : "text-ink-mute"}`}>
                          {voicing.position === 0 ? "al aire" : `traste ${voicing.position}`} · {voicing.fingers} {voicing.fingers === 1 ? "dedo" : "dedos"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => play(`voicing:${formatShape(voicing.shape)}`, [voicing.shape])}
                        aria-label={`Escuchar ${formatShape(voicing.shape)}`}
                        className="min-h-10 border-l border-inherit px-2 text-sm"
                      >
                        {playing === `voicing:${formatShape(voicing.shape)}` ? "■" : "▶"}
                      </button>
                    </span>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Estás tocando</p>
            {reading ? (
              <>
                <h2 className="mt-1 font-mono text-[44px] font-semibold leading-none">{reading.name}</h2>
                <p className="mt-2 text-sm text-ink-mute">
                  {current?.label ?? current?.type}
                  {reading.inversion ? ` · bajo en ${reading.bass} (inversión)` : ""}
                  {!reading.complete ? " · sin la quinta" : ""}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {(current?.notes ?? current?.triad ?? []).map(note => {
                    const sounding = soundingPcs.includes(NOTE_OFFSETS[note])
                    return (
                      <li
                        key={note}
                        className={`rounded-md px-2 py-1 text-sm ${sounding ? "bg-primary text-on-primary" : "border border-dashed border-hairline text-ink-faint"}`}
                      >
                        <span className="font-mono font-bold">{note}</span>{" "}
                        <span className="text-xs opacity-80">{intervalLabel(rootPc ?? 0, NOTE_OFFSETS[note], current?.type)}</span>
                      </li>
                    )
                  })}
                </ul>
                {readings.length > 1 ? (
                  <div className="mt-3 text-sm">
                    <span className="text-ink-mute">También se puede leer como </span>
                    {readings.slice(0, 4).map((item, index) =>
                      index === readingIndex ? null : (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setReadingIndex(index)}
                          className="mr-1.5 font-mono font-semibold underline decoration-dotted underline-offset-4"
                        >
                          {item.name}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-2 text-sm leading-6 text-ink-mute">
                {soundingPcs.length < 2 ? (
                  <p>Toca al menos dos notas distintas: un traste por cuerda, o escribe una forma arriba.</p>
                ) : (
                  <>
                    <p>
                      No reconozco un acorde con exactamente estas notas: <span className="font-mono text-ink">{soundingPcs.map(noteName).join(" ")}</span>.
                    </p>
                    {compatible.length ? (
                      <p className="mt-2">
                        Acordes que las contienen:{" "}
                        {compatible.map(match => (
                          <button
                            key={match.chord.id}
                            type="button"
                            onClick={() => loadChord(match.chord.id)}
                            className="mr-1.5 font-mono font-semibold text-ink underline decoration-dotted underline-offset-4"
                          >
                            {match.chord.id}
                          </button>
                        ))}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="next-title">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Qué sigue</p>
                <h2 id="next-title" className="font-display text-2xl">
                  Cerca de tu mano
                </h2>
              </div>
              <div role="radiogroup" aria-label="Ordenar" className="flex rounded-md border border-hairline p-0.5 text-[11px]">
                {(["score", "hand"] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={sortBy === value}
                    onClick={() => setSortBy(value)}
                    className={`min-h-8 rounded px-2 font-semibold ${sortBy === value ? "bg-ink text-canvas" : "text-ink-mute"}`}
                  >
                    {value === "score" ? "Mejor conexión" : "Menos movimiento"}
                  </button>
                ))}
              </div>
            </div>
            {!current ? (
              <p className="mt-3 text-sm text-ink-mute">Cuando reconozca el acorde te muestro los siguientes, con la digitación más cercana a la tuya.</p>
            ) : connectionsLoading && !nextOptions.length ? (
              <ul className="mt-3 space-y-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="h-20 animate-pulse rounded-md bg-hairline/50" />
                ))}
              </ul>
            ) : (
              <ul className="mt-3 space-y-2">
                {nextOptions.map(option => {
                  const { move } = option.voicing
                  const id = `next:${option.chord.id}`
                  return (
                    <li
                      key={option.chord.id}
                      onMouseEnter={() => setPreview(option.chord.id)}
                      onMouseLeave={() => setPreview(null)}
                      onFocus={() => setPreview(option.chord.id)}
                      onBlur={() => setPreview(null)}
                      className={`rounded-md border p-3 transition ${preview === option.chord.id ? "border-fn-tonic bg-fn-tonic/5" : "border-hairline"}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span>
                          <strong className="font-mono text-lg">{option.chord.id}</strong>{" "}
                          <span className="text-xs font-semibold" style={{ color: categoryColor(option.category) }}>
                            {connectionLabel(option.category)} {option.score}
                          </span>
                        </span>
                        <span className="font-mono text-sm text-ink-mute">{formatShape(option.voicing.shape)}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-mute">
                        {move.stay ? `${move.stay} ${move.stay === 1 ? "nota se queda" : "notas se quedan"} · ` : ""}
                        {move.moved} {move.moved === 1 ? "cuerda cambia" : "cuerdas cambian"}
                        {move.slide ? ` · desplazas ${move.slide} ${move.slide === 1 ? "traste" : "trastes"}` : " · misma posición"}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => play(id, [shape, option.voicing.shape])}
                          className="min-h-9 flex-1 rounded-md border border-hairline px-2 text-xs font-semibold hover:border-ink"
                        >
                          {playing === id ? "■ Detener" : `▶ ${reading?.name ?? ""} → ${option.chord.id}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => goTo(option)}
                          className="min-h-9 flex-1 rounded-md bg-primary px-2 text-xs font-bold text-on-primary hover:bg-primary-deep"
                        >
                          Tocar este
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="journey-title">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tu recorrido</p>
            <h2 id="journey-title" className="font-display text-2xl">
              {journey.length > 1 ? journey.map(step => step.name).join(" → ") : "Empieza con “Tocar este”"}
            </h2>
            {journey.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    play(
                      "journey",
                      journey.map(step => step.shape),
                    )
                  }
                  className="min-h-10 rounded-md bg-primary px-3 text-sm font-bold text-on-primary hover:bg-primary-deep"
                >
                  {playing === "journey" ? "■ Detener" : "▶ Escuchar"}
                </button>
                <button type="button" onClick={undo} className="min-h-10 rounded-md border border-hairline px-3 text-sm font-semibold hover:border-ink">
                  Deshacer
                </button>
                <Link
                  href={`/?chords=${encodeURIComponent(journey.map(step => step.chordId).join(","))}`}
                  className="inline-flex min-h-10 items-center rounded-md border border-hairline px-3 text-sm font-semibold hover:border-ink"
                >
                  Analizar
                </Link>
                <Link
                  href={`/explorer?chords=${encodeURIComponent(journey.map(step => step.chordId).join(","))}`}
                  className="inline-flex min-h-10 items-center rounded-md border border-hairline px-3 text-sm font-semibold hover:border-ink"
                >
                  Abrir en el explorador
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-mute">
                Cada acorde que elijas queda aquí con su digitación para escuchar la secuencia o llevarla al analizador.
              </p>
            )}
          </section>
        </aside>
      </section>
    </main>
  )
}
