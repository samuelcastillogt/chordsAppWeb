"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import PianoKeyboard from "@/components/instruments/PianoKeyboard"
import { get, getApiBaseUrl } from "@/lib/api"
import { Playback, getAudioContext, playStrums, strumMidis } from "@/lib/audio/synth"
import { identifyMidis, intervalLabel, noteName } from "@/lib/music/identify"
import { COMPUTER_KEYS, INVERSION_NAMES, VoiceLeading, chordInversions, describeMoves, midiName, parseMidiName, smoothestVoicing } from "@/lib/music/piano"
import { NOTE_OFFSETS, categoryColor, connectionLabel, findCompatibleChords } from "@/lib/music/theory"
import { Chord, ConnectionsResponse } from "@/types"

type Step = { name: string; chordId: string; midis: number[] }
type NextOption = { chord: Chord; score: number; category: string; voicing: VoiceLeading }

const START = [60, 64, 67]

export default function PianoPage() {
  return (
    <Suspense>
      <Piano />
    </Suspense>
  )
}

function Piano() {
  const searchParams = useSearchParams()
  const [pressed, setPressed] = useState<Set<number>>(() => {
    const fromUrl = (searchParams.get("notas") ?? "")
      .split(",")
      .map(parseMidiName)
      .filter((midi): midi is number => midi !== null)
    return new Set(fromUrl.length ? fromUrl : START)
  })
  const [readingIndex, setReadingIndex] = useState(0)
  const [labels, setLabels] = useState<"notes" | "intervals">("notes")
  const [preview, setPreview] = useState<string | null>(null)
  const [trail, setTrail] = useState<Step[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [midiStatus, setMidiStatus] = useState<"off" | "on" | "unsupported" | "denied">("off")
  const playback = useRef<Playback | null>(null)
  const held = useRef(new Set<number>())

  const { data: chords = [], isLoading, error } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const chordById = useMemo(() => new Map(chords.map(chord => [chord.id, chord])), [chords])

  const midis = useMemo(() => Array.from(pressed).sort((a, b) => a - b), [pressed])
  const readings = useMemo(() => identifyMidis(midis, chords), [midis, chords])
  const reading = readings[readingIndex] ?? readings[0] ?? null
  const current = reading?.chord ?? null
  const rootPc = current ? NOTE_OFFSETS[current.root] : null
  const soundingPcs = useMemo(() => Array.from(new Set(midis.map(midi => midi % 12))), [midis])

  useEffect(() => {
    setReadingIndex(0)
    const url = new URL(window.location.href)
    if (midis.length) url.searchParams.set("notas", midis.map(midiName).join(","))
    else url.searchParams.delete("notas")
    window.history.replaceState(null, "", url)
  }, [midis])

  useEffect(() => () => playback.current?.stop(), [])

  // Read through a ref so the computer-keyboard listener (bound once) always sees the current keys.
  const pressedRef = useRef(pressed)
  pressedRef.current = pressed

  function toggle(midi: number) {
    const next = new Set(pressedRef.current)
    if (next.has(midi)) next.delete(midi)
    else {
      next.add(midi)
      const context = getAudioContext()
      if (context) strumMidis([midi], context.currentTime + 0.01, context, context.destination, 1.2, 0)
    }
    setPressed(next)
  }

  // Computer keyboard as a piano (A W S E D F T G Y H U J K O L P Ñ = C4…E5).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest("input, textarea, select, [contenteditable]")) return
      const midi = COMPUTER_KEYS[event.key.toLowerCase()]
      if (midi !== undefined) {
        event.preventDefault()
        toggle(midi)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // MIDI keyboard: keys held together make the chord; the chord stays after you let go.
  async function connectMidi() {
    if (typeof navigator.requestMIDIAccess !== "function") {
      setMidiStatus("unsupported")
      return
    }
    try {
      const access = await navigator.requestMIDIAccess()
      const listen = () =>
        access.inputs.forEach(input => {
          input.onmidimessage = ({ data }) => {
            if (!data) return
            const [status, note, velocity] = Array.from(data)
            const command = status & 0xf0
            if (command === 0x90 && velocity > 0) {
              setPressed(currentKeys => {
                const next = held.current.size === 0 ? new Set<number>() : new Set(currentKeys)
                next.add(note)
                return next
              })
              held.current.add(note)
            } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
              held.current.delete(note)
            }
          }
        })
      listen()
      access.onstatechange = listen
      setMidiStatus("on")
    } catch {
      setMidiStatus("denied")
    }
  }

  const { data: connectionsData, isFetching: connectionsLoading } = useQuery<ConnectionsResponse>({
    queryKey: ["instrument-connections", current?.id],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${encodeURIComponent(current!.id)}/connections`, { min_score: 0, max_results: 12 }),
    enabled: !!current,
  })

  const nextOptions = useMemo<NextOption[]>(
    () =>
      (connectionsData?.connections ?? [])
        .flatMap(connection => {
          const chord = chordById.get(connection.target)
          const voicing = chord ? smoothestVoicing(midis, chord) : null
          return chord && voicing ? [{ chord, score: connection.score, category: connection.category, voicing }] : []
        })
        .slice(0, 6),
    [connectionsData, chordById, midis],
  )

  const inversions = current ? chordInversions(current, midis[0] ?? 60) : []
  const previewMidis = preview ? (nextOptions.find(option => option.chord.id === preview)?.voicing.midis ?? null) : null
  const compatible = useMemo(
    () => (readings.length || soundingPcs.length < 2 ? [] : findCompatibleChords(chords, soundingPcs.map(noteName)).slice(0, 5)),
    [readings, soundingPcs, chords],
  )

  function play(id: string, voicings: number[][]) {
    playback.current?.stop()
    if (playing === id) {
      setPlaying(null)
      return
    }
    setPlaying(id)
    playback.current = playStrums(voicings, { strum: 0, gap: 1.1, onStep: index => index === null && setPlaying(null) })
  }

  function setChord(next: number[]) {
    setPressed(new Set(next))
  }

  function goTo(option: NextOption) {
    if (reading) setTrail(steps => [...steps, { name: reading.name, chordId: reading.chord.id, midis }])
    setChord(option.voicing.midis)
    setPreview(null)
  }

  function undo() {
    const last = trail[trail.length - 1]
    if (!last) return
    setTrail(steps => steps.slice(0, -1))
    setChord(last.midis)
  }

  function loadChord(id: string) {
    const chord = chordById.get(id)
    if (!chord) return
    const voicing = smoothestVoicing(midis, chord) ?? chordInversions(chord)[0]
    setChord(voicing.midis)
  }

  const journey = [...trail, ...(reading ? [{ name: reading.name, chordId: reading.chord.id, midis }] : [])]

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
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-surface-violet-soft">Piano</p>
          <h1 className="mt-3 max-w-3xl text-[36px] leading-[1.02] md:text-[54px]">
            Toca un acorde. Te decimos cuál es y cómo pasar al siguiente moviendo lo mínimo.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-dark-mute">
            Haz clic en las teclas, usa el teclado de tu computadora o conecta un teclado MIDI. ChordWeaver nombra el acorde con su inversión y te muestra la
            conducción de voces hacia los acordes que siguen.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-3 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border border-hairline bg-canvas p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => play("current", [midis])}
                disabled={!midis.length}
                className="min-h-11 rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-50"
              >
                {playing === "current" ? "■ Detener" : "▶ Tocar"}
              </button>
              <button type="button" onClick={() => setChord([])} className="min-h-11 rounded-md border border-hairline px-4 font-semibold hover:border-ink">
                Limpiar
              </button>
              <div role="radiogroup" aria-label="Etiquetas" className="flex rounded-md border border-hairline p-0.5 text-xs">
                {(["notes", "intervals"] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={labels === value}
                    onClick={() => setLabels(value)}
                    className={`min-h-9 rounded px-3 font-semibold ${labels === value ? "bg-ink text-canvas" : "text-ink-mute"}`}
                  >
                    {value === "notes" ? "Notas" : "Intervalos"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={connectMidi}
                disabled={midiStatus === "on"}
                className={`ml-auto min-h-11 rounded-md border px-3 text-sm font-semibold ${midiStatus === "on" ? "border-fn-tonic text-fn-tonic" : "border-hairline hover:border-ink"}`}
              >
                {midiStatus === "on" ? "● Teclado MIDI conectado" : "Conectar teclado MIDI"}
              </button>
            </div>
            {midiStatus === "unsupported" ? (
              <p role="status" className="mt-2 text-xs text-fn-dominant">
                Este navegador no permite MIDI. Prueba con Chrome o Edge.
              </p>
            ) : midiStatus === "denied" ? (
              <p role="status" className="mt-2 text-xs text-fn-dominant">
                No se dio permiso para usar MIDI.
              </p>
            ) : null}

            <div className="mt-4">
              {isLoading ? (
                <div className="h-[244px] animate-pulse rounded-lg bg-hairline/50" />
              ) : (
                <PianoKeyboard pressed={pressed} onToggle={toggle} ghost={previewMidis} rootPc={rootPc} chordType={current?.type} labels={labels} />
              )}
            </div>
            <p className="mt-2 text-xs text-ink-mute">
              Clic en una tecla para agregarla o quitarla. Con el teclado de la computadora: <span className="font-mono">A W S E D F T G Y H U J K</span> = de
              C4 a C5.
              {previewMidis ? " Punteado verde: teclas a las que irías; anillo verde: la nota se queda." : ""}
            </p>
          </div>

          {current && inversions.length > 1 ? (
            <section className="rounded-xl border border-hairline bg-canvas p-4 shadow-card sm:p-5" aria-labelledby="inversions-title">
              <h2 id="inversions-title" className="font-display text-2xl">
                Inversiones de {current.id}
              </h2>
              <p className="mt-1 text-sm text-ink-mute">Las mismas notas con otra en el bajo: cambian el color y facilitan enlazar acordes.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {inversions.map(voicing => {
                  const active = voicing.midis.join() === midis.join()
                  const id = `inv:${voicing.inversion}`
                  return (
                    <span
                      key={voicing.inversion}
                      className={`flex items-center rounded-md border ${active ? "border-ink bg-ink text-canvas" : "border-hairline"}`}
                    >
                      <button type="button" onClick={() => setChord(voicing.midis)} aria-pressed={active} className="min-h-10 px-3 text-left">
                        <span className="block text-sm font-bold">{INVERSION_NAMES[voicing.inversion]}</span>
                        <span className={`block font-mono text-[11px] ${active ? "text-on-dark-mute" : "text-ink-mute"}`}>
                          {voicing.midis.map(midiName).join(" ")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => play(id, [voicing.midis])}
                        aria-label={`Escuchar ${INVERSION_NAMES[voicing.inversion]}`}
                        className="min-h-10 border-l border-inherit px-2 text-sm"
                      >
                        {playing === id ? "■" : "▶"}
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
                  {current?.label ?? current?.type} · {INVERSION_NAMES[reading.inversionNumber]?.toLowerCase()}
                  {!reading.complete ? " · sin la quinta" : ""}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {midis.map(midi => (
                    <li key={midi} className="rounded-md bg-primary px-2 py-1 text-sm text-on-primary">
                      <span className="font-mono font-bold">{midiName(midi)}</span>{" "}
                      <span className="text-xs opacity-80">{intervalLabel(rootPc ?? 0, midi % 12, current?.type)}</span>
                    </li>
                  ))}
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
                  <p>Toca al menos dos notas distintas.</p>
                ) : (
                  <>
                    <p>
                      No reconozco un acorde con exactamente estas notas: <span className="font-mono text-ink">{midis.map(midiName).join(" ")}</span>.
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Qué sigue</p>
            <h2 id="next-title" className="font-display text-2xl">
              Moviendo lo mínimo
            </h2>
            {!current ? (
              <p className="mt-3 text-sm text-ink-mute">Cuando reconozca el acorde te muestro los siguientes en la inversión más cercana a tus dedos.</p>
            ) : connectionsLoading && !nextOptions.length ? (
              <ul className="mt-3 space-y-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="h-20 animate-pulse rounded-md bg-hairline/50" />
                ))}
              </ul>
            ) : (
              <ul className="mt-3 space-y-2">
                {nextOptions.map(option => {
                  const { stay, moved, added, released } = describeMoves(option.voicing.moves)
                  const changes = [...moved, ...added.map(note => `agrega ${note}`), ...released.map(note => `suelta ${note}`)]
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
                        <span className="text-xs text-ink-mute">{INVERSION_NAMES[option.voicing.inversion]}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-ink-mute">
                        {stay.length ? (
                          <>
                            <span className="font-semibold text-fn-tonic">
                              Se queda{stay.length > 1 ? "n" : ""}: {stay.join(", ")}
                            </span>
                            {changes.length ? " · " : ""}
                          </>
                        ) : null}
                        {changes.join(" · ")}
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => play(id, [midis, option.voicing.midis])}
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
                      journey.map(step => step.midis),
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
                Cada acorde que elijas queda aquí con sus teclas para escuchar la secuencia o llevarla al analizador.
              </p>
            )}
          </section>
        </aside>
      </section>
    </main>
  )
}
