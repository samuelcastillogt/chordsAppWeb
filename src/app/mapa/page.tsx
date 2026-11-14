"use client"

import Link from "next/link"
import { DragEvent, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import SongInsights from "@/components/songmap/SongInsights"
import SongMandala from "@/components/songmap/SongMandala"
import PlayerControls from "@/components/ui/PlayerControls"
import { get, post } from "@/lib/api"
import { usePlayer } from "@/lib/audio/usePlayer"
import { useAuth } from "@/lib/auth/AuthProvider"
import { downloadSvg, downloadSvgAsPng } from "@/lib/export"
import { MANDALA_FAMILIES, Key, buildMandala, keySpoke, mandalaNodeId, parallelSpoke, parseKey } from "@/lib/music/mandala"
import { collapseRepeats, condenseSong } from "@/lib/music/song"
import {
  collapseSteps,
  harmonicProfile,
  nodeUsage,
  readSongHandoff,
  sectionLabels,
  songLoops,
  songSteps,
  songTransitions,
  spellChord,
} from "@/lib/music/songmap"
import { functionColor } from "@/lib/music/theory"
import { AnalyzeResponse, Chord, StyleParseResponse } from "@/types"

const MAX_FILE_BYTES = 200_000
const MAX_PLAYBACK_STEPS = 160

// An original example (chords only): a pop verse and chorus, a ♭VI–♭VII–I bridge borrowed from the
// minor, a secondary dominant and a last chorus one tone up, so every part of the map shows.
const DEMO_TITLE = "Ejemplo: balada pop con modulación"
const DEMO_TEXT = `[Intro]
C G Am F
[Verso]
C G Am F
C G F G
[Pre-coro]
Dm Em F G
[Coro]
F G Em Am
F G C C7
[Verso]
C G Am F
C G F G
[Coro]
F G Em Am
F G C C7
[Puente]
Ab Bb C
Ab Bb G
[Coro]
G A F#m Bm
G A D D`

type Song = StyleParseResponse & { source: "demo" | "upload" }

export default function SongMapPage() {
  const { user, ready, accountsEnabled, openDialog } = useAuth()
  const isPro = !!user && user.plan !== "free"
  const [song, setSong] = useState<Song | null>(null)
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState<number | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [playIndex, setPlayIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const player = usePlayer({ bpm: 96 })
  const [handoff, setHandoff] = useState<{ title: string; text: string } | null>(null)

  // A song uploaded in the analyzer opens here directly for Pro users.
  useEffect(() => setHandoff(readSongHandoff()), [])
  useEffect(() => {
    if (!handoff || !isPro || song) return
    setText(handoff.text)
    setFileName(handoff.title)
    void load(handoff.text, handoff.title, "upload")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff, isPro])

  const { data: catalog = [] } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const chordById = useMemo(() => new Map(catalog.map(chord => [chord.id, chord])), [catalog])
  const toNode = useMemo(
    () => (chord: string) => {
      const known = chordById.get(chord)
      return (known && mandalaNodeId(known)) ?? chord
    },
    [chordById],
  )

  async function load(sheet: string, title: string, source: Song["source"]) {
    setError(null)
    setLoading(true)
    player.stop()
    try {
      const parsed = await post<StyleParseResponse>("/api/v1/style/parse", { text: sheet, title })
      if (parsed.chords.length < 2) throw new Error("No encontré acordes. Sube un cifrado (acordes sobre la letra), un ChordPro o una tablatura en texto.")
      setSong({ ...parsed, source })
      setSection(null)
      setSelectedNode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la canción")
    } finally {
      setLoading(false)
    }
  }

  async function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError("El archivo es muy grande: sube una sola canción en texto plano (.txt).")
      return
    }
    const content = await file.text()
    setFileName(file.name)
    setText(content)
    await load(content, file.name.replace(/\.[^.]+$/, ""), "upload")
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && isPro) void readFile(file)
  }

  const songKey: Key = (song?.key && parseKey(song.key)) || parseKey("C")!
  const sections = useMemo(() => (song ? (song.sections.length ? song.sections : [{ name: "", chords: song.chords }]) : []), [song])
  const labels = useMemo(() => sectionLabels(sections), [sections])
  const steps = useMemo(() => songSteps(sections, toNode), [sections, toNode])
  const usage = useMemo(() => nodeUsage(steps), [steps])
  const transitions = useMemo(() => songTransitions(steps), [steps])
  const nodeById = useMemo(
    () =>
      new Map(
        buildMandala(
          songKey,
          MANDALA_FAMILIES.map(item => item.id),
        ).map(node => [node.id, node]),
      ),
    [songKey],
  )
  const degreeOf = (node: string) => nodeById.get(node)?.degree ?? null
  const profile = useMemo(() => harmonicProfile(usage, node => nodeById.get(node)?.degree ?? null), [usage, nodeById])
  const loops = useMemo(() => songLoops(steps, node => nodeById.get(node)?.degree ?? null), [steps, nodeById])
  const playback = useMemo(() => collapseSteps(steps).slice(0, MAX_PLAYBACK_STEPS), [steps])

  // Each section with enough harmony gets its own key; one outside the song key's petal is a modulation.
  const { data: sectionKeys = [] } = useQuery({
    queryKey: ["song-section-keys", song?.title, sections.map(item => item.chords.join(" ")).join("|")],
    enabled: !!song,
    staleTime: Infinity,
    queryFn: () =>
      Promise.all(
        sections.map(async item => {
          const chords = collapseRepeats(item.chords).slice(0, 64)
          if (new Set(chords).size < 3) return null
          try {
            const { analysis } = await post<AnalyzeResponse>("/api/v1/analyze", { chords })
            return analysis.key.confidence >= 0.55 ? parseKey(analysis.key.id) : null
          } catch {
            return null
          }
        }),
      ),
  })
  // A section that sounds in the parallel key (C minor inside C major) borrows from it; anywhere
  // else outside the song's petal it modulates.
  const keyChanges = sectionKeys.flatMap((key, index) =>
    key && keySpoke(key) !== keySpoke(songKey)
      ? [{ index, section: labels[index], key, kind: keySpoke(key) === parallelSpoke(songKey) ? ("borrow" as const) : ("modulation" as const) }]
      : [],
  )
  const modulations = keyChanges.filter(item => item.kind === "modulation")
  const modulationKeys = Array.from(new Map(modulations.map(item => [item.key.label, item.key])).values())

  const playing = playIndex !== null && playback[playIndex] ? { step: playback[playIndex], previous: playback[playIndex - 1] ?? null } : null
  const condensed = song ? condenseSong(sections) : []

  function playSong() {
    player.play(
      playback.map(step => chordById.get(step.chord)?.notes ?? chordById.get(step.chord)?.triad ?? []),
      "song",
      index => setPlayIndex(index),
    )
  }

  function exportMap(format: "png" | "svg") {
    const svg = mapRef.current?.querySelector("svg")
    if (!svg || !song) return
    const title = `mapa-armonico-${song.title}`
    if (format === "svg") downloadSvg(svg, title)
    else downloadSvgAsPng(svg, title)
  }

  const selectedUse = selectedNode ? usage.get(selectedNode) : undefined
  const canUpload = isPro

  return (
    <main className="min-h-screen bg-canvas-soft text-ink">
      <section className="thread-bg text-on-primary">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-surface-violet-soft">
            Mapa armónico <span className="rounded-full bg-surface-violet-soft px-2 py-0.5 text-[10px] tracking-[0.1em] text-primary">PRO</span>
          </p>
          <h1 className="mt-3 max-w-3xl text-[36px] leading-[1.02] md:text-[54px]">Sube una canción y mira su armonía de un vistazo.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-dark-mute">
            Del cifrado o la tablatura sale un mapa: cada acorde crece con lo que suena, cada flecha es un movimiento de la canción y se nota en qué tonalidad
            vive, qué toma prestado y dónde modula.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div
              onDragOver={event => {
                event.preventDefault()
                if (canUpload) setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-xl border bg-primary-deep/60 p-4 ${dragging ? "border-surface-violet-soft" : "border-hairline-dark"}`}
            >
              {canUpload ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-surface-violet-soft px-4 font-bold text-primary hover:bg-white">
                      {loading && song?.source !== "demo" ? "Leyendo..." : "Subir cifrado o tablatura (.txt)"}
                      <input
                        type="file"
                        accept=".txt,.pro,.chopro,.cho,text/plain"
                        className="sr-only"
                        onChange={event => {
                          const file = event.target.files?.[0]
                          if (file) void readFile(file)
                          event.target.value = ""
                        }}
                      />
                    </label>
                    {fileName ? <span className="text-sm text-on-dark-mute">{fileName}</span> : null}
                  </div>
                  <label htmlFor="sheet" className="mt-3 block text-sm text-on-dark-mute">
                    …o pégalo aquí (acordes sobre la letra, ChordPro o tablatura ASCII; marca las secciones como [Verso], [Coro]):
                  </label>
                  <textarea
                    id="sheet"
                    value={text}
                    onChange={event => setText(event.target.value)}
                    rows={6}
                    spellCheck={false}
                    className="mt-1 w-full rounded-md border border-hairline-dark bg-primary p-3 font-mono text-sm text-on-primary outline-none focus:border-surface-violet-soft"
                  />
                  <button
                    type="button"
                    disabled={!text.trim() || loading}
                    onClick={() => load(text, fileName?.replace(/\.[^.]+$/, "") || "Mi canción", "upload")}
                    className="mt-2 min-h-11 rounded-md bg-surface-violet-soft px-5 font-bold text-primary hover:bg-white disabled:opacity-50"
                  >
                    Generar mapa
                  </button>
                </>
              ) : (
                <div className="text-sm leading-6 text-on-dark-mute">
                  <p className="text-base font-semibold text-on-primary">Analizar tus canciones es parte del plan Pro.</p>
                  <p className="mt-1">
                    {handoff ? (
                      <>
                        Tienes <strong className="text-on-primary">{handoff.title}</strong> lista desde el analizador: con Pro verás su mapa aquí mismo.
                        Mientras tanto, mira el ejemplo.
                      </>
                    ) : (
                      "Mientras tanto, mira cómo se ve el mapa con una canción de ejemplo."
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!ready ? null : !accountsEnabled ? (
                      <span className="text-xs">Las cuentas no están activas en este servidor.</span>
                    ) : !user ? (
                      <button
                        type="button"
                        onClick={openDialog}
                        className="min-h-11 rounded-md bg-surface-violet-soft px-4 font-bold text-primary hover:bg-white"
                      >
                        Entrar o crear cuenta
                      </button>
                    ) : (
                      <Link
                        href="/precios"
                        className="inline-flex min-h-11 items-center rounded-md bg-surface-violet-soft px-4 font-bold text-primary hover:bg-white"
                      >
                        Pasarme a Pro
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-hairline-dark p-4 text-sm text-on-dark-mute">
              <p>
                <strong className="text-on-primary">¿Primera vez?</strong> El ejemplo tiene un verso y un coro pop, un puente con acordes prestados
                (♭VI–♭VII–I), una dominante secundaria y un último coro que sube un tono.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFileName(null)
                  void load(DEMO_TEXT, DEMO_TITLE, "demo")
                }}
                className="min-h-11 rounded-md border border-hairline-dark px-4 font-bold text-on-primary hover:bg-white/10"
              >
                {loading && song?.source === "demo" ? "Cargando..." : "Ver el ejemplo"}
              </button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-4 rounded-md border border-fn-dominant/40 bg-fn-dominant/10 px-4 py-3 text-sm text-on-primary">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {song ? (
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-3 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-xl border border-hairline bg-canvas p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">
                    {song.source === "demo" ? "Canción de ejemplo" : "Tu canción"}
                  </p>
                  <h2 className="mt-1 text-3xl">{song.title}</h2>
                  <p className="mt-1 text-sm text-ink-mute">
                    {steps.length} acordes en {sections.length} {sections.length === 1 ? "sección" : "secciones"}
                    {song.tabChords ? ` · ${song.tabChords} leídos de tablatura` : ""}
                    {song.unknown.length ? ` · ignoré: ${song.unknown.slice(0, 6).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => exportMap("png")}
                    className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink"
                  >
                    Descargar PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => exportMap("svg")}
                    className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink"
                  >
                    Descargar SVG
                  </button>
                </div>
              </div>

              <div role="radiogroup" aria-label="Sección" className="mt-4 flex flex-wrap gap-1.5">
                {[null, ...sections.map((_, index) => index)].map(index => {
                  const active = section === index
                  const sounding = index !== null && playing?.step.section === index
                  return (
                    <button
                      key={index ?? "all"}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSection(index)}
                      className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${active ? "border-ink bg-ink text-canvas" : "border-hairline hover:border-ink/40"} ${sounding ? "ring-2 ring-surface-violet-soft" : ""}`}
                    >
                      {index === null ? "Toda la canción" : labels[index]}
                      {index !== null && modulations.some(item => item.index === index) ? " ↗" : ""}
                    </button>
                  )
                })}
              </div>

              <div ref={mapRef} className="mt-3 rounded-lg bg-canvas-soft p-1 sm:p-3">
                <SongMandala
                  songKey={songKey}
                  modulations={modulationKeys}
                  usage={usage}
                  transitions={transitions}
                  section={section}
                  playing={playing}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                />
              </div>

              <div className="mt-3">
                <PlayerControls
                  settings={player.settings}
                  onChange={player.setSettings}
                  isPlaying={player.playingId === "song"}
                  onPlay={playSong}
                  onStop={player.stop}
                  playLabel="Escuchar la canción"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-mute">
                Tamaño = cuánto suena el acorde. Flecha = un movimiento de la canción (más gruesa cuanto más se repite), del color de la función del acorde al
                que llega. Pétalo dorado: {songKey.label}; violeta: sus préstamos
                {modulationKeys.length ? `; verde: ${modulationKeys.map(key => key.label).join(", ")}` : ""}. Toca un acorde para ver solo sus caminos.
              </p>
            </div>

            {selectedNode && selectedUse ? (
              <section className="rounded-xl border border-ink/30 bg-canvas p-5 shadow-card" aria-live="polite">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-mono text-3xl font-semibold">{selectedUse.chords.map(chord => spellChord(chord, songKey)).join(" / ")}</h2>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: degreeOf(selectedNode) ? functionColor(degreeOf(selectedNode)!.function, degreeOf(selectedNode)!.role) : "#6b7280" }}
                    >
                      {degreeOf(selectedNode)?.numeral ?? "Fuera de la tonalidad"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    aria-label="Cerrar"
                    className="h-8 w-8 rounded-full text-lg text-ink-mute hover:bg-canvas-soft"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-2 text-sm text-ink-mute">
                  Suena {selectedUse.count} {selectedUse.count === 1 ? "vez" : "veces"} ({Math.round((selectedUse.count / steps.length) * 100)}% de la canción),
                  en {selectedUse.sections.map(index => labels[index]).join(", ")}.
                </p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {(["to", "from"] as const).map(side => {
                    const list = transitions.filter(move => (side === "to" ? move.to : move.from) === selectedNode).slice(0, 4)
                    return (
                      <div key={side}>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">{side === "to" ? "Llega desde" : "Va hacia"}</p>
                        <ul className="mt-1 space-y-0.5">
                          {list.length ? (
                            list.map(move => {
                              const other = side === "to" ? move.from : move.to
                              const use = usage.get(other)
                              return (
                                <li key={other}>
                                  <span className="font-mono font-bold">{spellChord(use?.chords.length === 1 ? use.chords[0] : other, songKey)}</span>{" "}
                                  <span className="text-ink-mute">×{move.count}</span>
                                </li>
                              )
                            })
                          ) : (
                            <li className="text-ink-mute">—</li>
                          )}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="sections-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="sections-title" className="font-display text-xl">
                  La canción, sección por sección
                </h2>
                <span className="flex gap-2 text-xs">
                  <Link
                    href={`/?chords=${encodeURIComponent(condensed.join(","))}&key=${encodeURIComponent(song.key ?? "")}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    Abrir en el analizador
                  </Link>
                  <Link
                    href={`/explorer?chords=${encodeURIComponent(condensed.join(","))}&key=${encodeURIComponent(song.key ?? "")}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    Abrir en el explorador
                  </Link>
                </span>
              </div>
              <ol className="mt-3 space-y-3">
                {sections.map((item, index) => {
                  const modulation = modulations.find(entry => entry.index === index)
                  let offset = 0
                  for (let i = 0; i < index; i++) offset += sections[i].chords.length
                  return (
                    <li key={index}>
                      <button type="button" onClick={() => setSection(section === index ? null : index)} className="text-sm font-semibold hover:underline">
                        {labels[index]}
                        {modulation ? <span className="ml-1 text-xs font-normal text-[#1c5a52]">modula a {modulation.key.label}</span> : null}
                      </button>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.chords.map((chord, position) => {
                          const node = toNode(chord)
                          const degree = degreeOf(node)
                          // Playback steps are the same objects as the song's steps (repeats skipped).
                          const sounding = playing !== null && steps[offset + position] === playing.step
                          return (
                            <span
                              key={position}
                              className={`rounded-md border px-1.5 py-0.5 font-mono text-xs ${sounding ? "border-ink bg-surface-violet-soft/40" : "border-hairline"}`}
                              style={{ borderLeftColor: degree ? functionColor(degree.function, degree.role) : "#6b7280", borderLeftWidth: 3 }}
                              title={degree?.numeral ?? "fuera de la tonalidad"}
                            >
                              {spellChord(chord, songKey)}
                            </span>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          </div>

          <aside>
            <SongInsights
              songKey={songKey}
              keyChanges={keyChanges.map(item => ({ section: item.section, key: item.key, kind: item.kind }))}
              profile={profile}
              usage={usage}
              transitions={transitions}
              loops={loops}
              degreeOf={degreeOf}
              total={steps.length}
            />
          </aside>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Su forma",
                body: "Los acordes que más suenan se ven grandes; los movimientos que se repiten, gruesos. Cada canción deja una figura distinta.",
              },
              { title: "Su tonalidad", body: "El pétalo dorado es la tonalidad. Lo que cae fuera son préstamos, dominantes secundarias o una modulación." },
              { title: "Su recorrido", body: "Escúchala y mira cómo viaja por el mapa, sección por sección. Exporta la imagen para tus clases o redes." },
            ].map(item => (
              <article key={item.title} className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
                <h2 className="text-2xl">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-mute">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
