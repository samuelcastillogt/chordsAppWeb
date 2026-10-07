"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import PlayerControls from "@/components/PlayerControls"
import TensionCurve from "@/components/TensionCurve"
import { get, post } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { downloadSvgAsPng } from "@/lib/export"
import { functionColor, functionLabel, splitChordInput } from "@/lib/music"
import { changedIndices } from "@/lib/progression"
import { usePlayer } from "@/lib/usePlayer"
import { AnalyzeResponse, Chord, Degree, ParsedChord, Progression, TablatureResponse } from "@/types"

const EXAMPLES = [
  { label: "De música ligera", chords: "Bm G D A" },
  { label: "Persiana americana", chords: "Em C G D" },
  { label: "Canon pop", chords: "C G Am F" },
  { label: "ii-V-I de jazz", chords: "Dm7 G7 Cmaj7" },
  { label: "Cadencia andaluza", chords: "Am G F E" },
  { label: "Blues en La", chords: "A7 D7 A7 E7" },
]

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const DISPLAY_ROOT: Record<string, string> = { "C#": "C#/Db", "D#": "Eb", "F#": "F#/Gb", "G#": "Ab", "A#": "Bb" }
const KEYS = [
  ...ROOTS.map(root => ({ id: root, label: `${DISPLAY_ROOT[root] ?? root} mayor` })),
  ...ROOTS.map(root => ({ id: `${root}m`, label: `${DISPLAY_ROOT[root] ?? root} menor` })),
]

type Parsed = { recognized: ParsedChord[]; ignored: string[] }
type AnalysisResult = { parsed: Parsed; response: AnalyzeResponse }

/** Parse + analyze pipeline shared by the main analysis and the A/B variant. */
async function analyzeText(text: string, key: string): Promise<AnalysisResult> {
  const symbols = splitChordInput(text)
  if (symbols.length < 2) throw new Error("Escribe al menos dos acordes, por ejemplo: Am F C G")
  const { results } = await post<{ results: ParsedChord[] }>("/api/v1/chords/parse", { symbols })
  const recognized = results.filter(result => result.chord)
  const ignored = results.filter(result => !result.chord).map(result => result.input)
  if (recognized.length < 2) throw new Error("No reconocí suficientes acordes. Revisa la escritura (ej.: Bm, F#m7, D/F#, SOLm).")
  const response = await post<AnalyzeResponse>("/api/v1/analyze", { chords: recognized.map(item => item.input), tonality: key || undefined })
  return { parsed: { recognized, ignored }, response }
}

function songFromUtm(content: string | null): string | null {
  if (!content?.startsWith("song:")) return null
  const slug = content.slice(5).split("/").pop() ?? ""
  const title = slug.replace(/-/g, " ").trim()
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : null
}

export default function Analyzer() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user, accountsEnabled, openDialog } = useAuth()
  const initialChords = (searchParams.get("chords") ?? "").split(",").filter(Boolean).join(" ")
  const fromSong = songFromUtm(searchParams.get("utm_content"))
  const source = searchParams.get("utm_content")

  const initialKey = searchParams.get("key") ?? ""
  const [input, setInput] = useState(initialChords)
  const [keyOverride, setKeyOverride] = useState(initialKey)
  const [submitted, setSubmitted] = useState<{ text: string; key: string } | null>(
    initialChords ? { text: initialChords, key: initialKey } : null,
  )
  const [variant, setVariant] = useState<string[] | null>(null)
  const curveRef = useRef<HTMLDivElement>(null)
  const player = usePlayer()
  const [saveName, setSaveName] = useState(fromSong ?? "")
  const [notice, setNotice] = useState<string | null>(null)

  const { data: catalog = [] } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const notesById = useMemo(() => new Map(catalog.map(chord => [chord.id, chord.notes ?? chord.triad])), [catalog])

  const analysisQuery = useQuery({
    queryKey: ["analysis", submitted],
    enabled: !!submitted,
    retry: false,
    queryFn: () => analyzeText(submitted!.text, submitted!.key),
  })
  const parsed = analysisQuery.data?.parsed ?? null
  const analysis = analysisQuery.data?.response.analysis
  const progressionChords = analysis?.chords ?? []
  const originalSymbols = useMemo(() => parsed?.recognized.map(item => item.input) ?? [], [parsed])

  // Variant B is analysed in the same key as A so the comparison is fair.
  const variantText = variant?.join(" ") ?? ""
  const variantQuery = useQuery({
    queryKey: ["analysis", { text: variantText, key: analysis?.key.id ?? "" }],
    enabled: !!variant && !!analysis,
    retry: false,
    queryFn: () => analyzeText(variantText, analysis!.key.id),
  })
  const variantAnalysis = variantQuery.data?.response.analysis

  const tablatureMutation = useMutation({
    mutationFn: (chords: string[]) => post<TablatureResponse>("/api/v1/tablature", { chords, title: saveName || "Progresión" }),
  })

  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ name: string; chords: string[]; tonality: string }>) => {
      for (const item of items) {
        await post<Progression>("/api/v1/progressions", { ...item, source: source?.slice(0, 200) ?? null })
      }
      return items.length
    },
    onSuccess: count => {
      setNotice(count > 1 ? "Original y variante guardadas en tu biblioteca." : "Guardada en tu biblioteca.")
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
  })

  function run(text = input, key = keyOverride) {
    setNotice(null)
    tablatureMutation.reset()
    saveMutation.reset()
    player.stop()
    setVariant(null)
    setSubmitted({ text: text.trim(), key })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    run()
  }

  /** Substitutions build variant B on top of A (or of the current B), keeping A intact to compare. */
  function tryReplacement(index: number, replacement: string) {
    const next = [...(variant ?? originalSymbols)]
    next[index] = replacement
    saveMutation.reset()
    setNotice(null)
    setVariant(changedIndices(originalSymbols, next).length ? next : null)
  }

  function keepVariant() {
    if (!variant) return
    const text = variant.join(" ")
    setInput(text)
    run(text, keyOverride)
  }

  function playChords(ids: string[], id: string) {
    player.play(ids.map(chord => notesById.get(chord) ?? []), id)
  }

  function save(includeVariant = false) {
    if (!analysis) return
    if (!user) {
      openDialog()
      return
    }
    const name = saveName.trim() || "Progresión sin nombre"
    const items = [{ name, chords: analysis.chords, tonality: analysis.key.id }]
    if (includeVariant && variantAnalysis) items.push({ name: `${name} (variante)`, chords: variantAnalysis.chords, tonality: analysis.key.id })
    saveMutation.mutate(items)
  }

  function exportCurve() {
    const svg = curveRef.current?.querySelector("svg")
    if (svg) downloadSvgAsPng(svg, `${saveName || "progresion"}-fluidez`)
  }

  function downloadTablature(tablature: TablatureResponse) {
    const url = URL.createObjectURL(new Blob([tablature.text], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${(saveName || "progresion").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const explorerHref = analysis
    ? `/explorer?chords=${encodeURIComponent(analysis.chords.join(","))}&key=${encodeURIComponent(analysis.key.id)}`
    : "/explorer"

  return (
    <main>
      <section className="thread-bg text-on-primary">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 md:pt-20">
          {fromSong ? (
            <p className="mb-6 inline-flex rounded-full border border-hairline-dark bg-white/5 px-4 py-2 text-sm text-on-dark-mute">
              Vienes de <strong className="mx-1 text-on-primary">{fromSong}</strong> · ya cargamos sus acordes
            </p>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-surface-violet-soft">No es otro cancionero</p>
          <h1 className="mt-4 max-w-4xl text-[40px] font-semibold leading-[1.02] md:text-[68px]">
            Pega los acordes de una canción. Te decimos <em className="text-surface-violet-soft">por qué funciona</em>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-on-dark-mute">
            ChordWeaver lee la armonía como un músico: detecta la tonalidad, nombra cada acorde por su grado, marca dónde está la tensión y te propone acordes para reemplazarlos o seguir componiendo.
          </p>

          <form onSubmit={onSubmit} className="mt-8 rounded-xl border border-hairline-dark bg-primary-deep/60 p-4 shadow-2xl md:p-5">
            <label htmlFor="chords-input" className="text-sm font-semibold text-on-dark-mute">Acordes (separados por espacios)</label>
            <div className="mt-2 flex flex-col gap-3 md:flex-row">
              <input
                id="chords-input"
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Bm G D A"
                autoComplete="off"
                spellCheck={false}
                className="min-h-14 flex-1 rounded-lg border border-hairline-dark bg-primary px-4 font-mono text-xl text-on-primary outline-none placeholder:text-on-dark-mute/50 focus:border-surface-violet-soft"
              />
              <select
                value={keyOverride}
                onChange={event => setKeyOverride(event.target.value)}
                aria-label="Tonalidad"
                className="min-h-14 rounded-lg border border-hairline-dark bg-primary px-3 text-on-primary outline-none focus:border-surface-violet-soft"
              >
                <option value="">Detectar tonalidad</option>
                {KEYS.map(key => <option key={key.id} value={key.id}>{key.label}</option>)}
              </select>
              <button type="submit" disabled={analysisQuery.isFetching} className="min-h-14 rounded-lg bg-surface-violet-soft px-6 text-lg font-bold text-primary transition hover:bg-white disabled:opacity-60">
                {analysisQuery.isFetching ? "Analizando..." : "Analizar"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-on-dark-mute">Prueba</span>
              {EXAMPLES.map(example => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => { setInput(example.chords); setKeyOverride(""); run(example.chords, "") }}
                  className="rounded-full border border-hairline-dark px-3 py-1.5 text-sm text-on-dark-mute transition hover:border-surface-violet-soft hover:text-on-primary"
                >
                  {example.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-on-dark-mute/80">Entiende cifrado americano y latino (DO, SOLm), bemoles, séptimas, sus, add9 y acordes con bajo (D/F#).</p>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {analysisQuery.isError ? (
          <div role="alert" className="rounded-lg border border-fn-dominant/30 bg-fn-dominant/10 p-5 text-fn-dominant">
            {analysisQuery.error instanceof Error ? analysisQuery.error.message : "No se pudo analizar"}
          </div>
        ) : null}

        {parsed?.ignored.length && analysis ? (
          <p className="mb-6 rounded-lg border border-hairline bg-canvas px-4 py-3 text-sm text-ink-mute">
            Ignoré lo que no parece un acorde: <span className="font-mono text-ink">{parsed.ignored.join(" ")}</span>
          </p>
        ) : null}

        {analysis ? (
          <div className="flex flex-col gap-8">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tonalidad</p>
                <h2 className="mt-1 text-[44px] leading-none">{analysis.key.label}</h2>
                <p className="mt-2 text-sm text-ink-mute">
                  {analysis.key.detected
                    ? `Detectada automáticamente · confianza ${Math.round(analysis.key.confidence * 100)}%. ¿No es esa? Elige otra arriba.`
                    : "Elegida por ti."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={explorerHref} className="inline-flex min-h-11 items-center rounded-md border border-ink/20 bg-canvas px-5 font-bold hover:border-ink">Explorar qué sigue</Link>
                <button type="button" onClick={() => tablatureMutation.mutate(analysis.chords)} className="min-h-11 rounded-md border border-ink/20 bg-canvas px-5 font-bold hover:border-ink">
                  {tablatureMutation.isPending ? "Generando..." : "Tablatura"}
                </button>
              </div>
            </div>

            <PlayerControls
              settings={player.settings}
              onChange={player.setSettings}
              isPlaying={player.playingId === "A"}
              onPlay={() => playChords(progressionChords, "A")}
              onStop={player.stop}
            />

            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analysis.degrees.map((degree, index) => (
                <DegreeCard
                  key={`${degree.input}-${index}`}
                  degree={degree}
                  active={player.playingId === "A" && player.current === index}
                  pending={variant?.[index] !== undefined && variant[index] !== originalSymbols[index] ? variant[index] : null}
                  onReplace={replacement => tryReplacement(index, replacement)}
                />
              ))}
            </ol>

            {variant ? (
              <CompareAB
                original={originalSymbols}
                variant={variant}
                analysisA={analysis}
                analysisB={variantAnalysis ?? null}
                loading={variantQuery.isFetching}
                error={variantQuery.isError ? (variantQuery.error as Error).message : null}
                playingId={player.playingId}
                playingIndex={player.current}
                onPlay={id => (player.playingId === id ? player.stop() : playChords(id === "A" ? progressionChords : variantAnalysis?.chords ?? [], id))}
                onKeep={keepVariant}
                onDiscard={() => {
                  player.stop()
                  setVariant(null)
                }}
                onSaveBoth={accountsEnabled ? () => save(true) : null}
                saving={saveMutation.isPending}
                user={!!user}
              />
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl">Fluidez de cada cambio</h3>
                    <p className="mb-4 mt-1 text-sm text-ink-mute">Promedio {analysis.averageScore}/100</p>
                  </div>
                  <button type="button" onClick={exportCurve} className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink">PNG</button>
                </div>
                <div ref={curveRef}>
                  <TensionCurve points={analysis.tensionCurve} chords={analysis.degrees.map(degree => degree.input)} />
                </div>
              </section>
              <section className="flex flex-col gap-4 rounded-xl border border-hairline bg-canvas p-5 shadow-card">
                <h3 className="font-display text-2xl">Lo que cuenta esta armonía</h3>
                <ul className="flex flex-col gap-3 text-sm leading-6">
                  {analysis.suggestions.map(suggestion => (
                    <li key={suggestion} className="border-l-2 border-surface-violet-soft pl-3">{suggestion}</li>
                  ))}
                </ul>
                {accountsEnabled ? (
                  <div className="mt-auto flex flex-col gap-2 border-t border-hairline pt-4">
                    <label htmlFor="save-name" className="text-sm font-semibold">Guardar en mi biblioteca</label>
                    <div className="flex gap-2">
                      <input id="save-name" value={saveName} onChange={event => setSaveName(event.target.value)} placeholder="Nombre de la progresión" className="min-h-11 min-w-0 flex-1 rounded-md border border-hairline px-3 outline-none focus:border-ink" />
                      <button type="button" onClick={() => save()} disabled={saveMutation.isPending} className="min-h-11 rounded-md bg-surface-teal-deep px-4 font-bold text-on-primary hover:bg-surface-teal-mid disabled:opacity-60">
                        {user ? "Guardar" : "Entrar y guardar"}
                      </button>
                    </div>
                    {notice ? <p className="text-sm text-fn-tonic">{notice} <Link href="/progressions" className="font-semibold underline">Ver biblioteca</Link></p> : null}
                    {saveMutation.isError ? <p className="text-sm text-fn-dominant">{(saveMutation.error as Error).message}</p> : null}
                  </div>
                ) : null}
              </section>
            </div>

            {tablatureMutation.data ? (
              <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-2xl">Tablatura</h3>
                  <button type="button" onClick={() => downloadTablature(tablatureMutation.data)} className="min-h-10 rounded-md border border-ink/20 px-4 font-semibold hover:border-ink">Descargar TXT</button>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-primary p-4 font-mono text-sm leading-6 text-on-primary">{tablatureMutation.data.text}</pre>
              </section>
            ) : null}
          </div>
        ) : !analysisQuery.isFetching ? (
          <HowItWorks />
        ) : null}
      </section>
    </main>
  )
}

function DegreeCard({ degree, active, pending, onReplace }: { degree: Degree; active: boolean; pending: string | null; onReplace: (chord: string) => void }) {
  const color = functionColor(degree.function, degree.role)
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-xl border bg-canvas shadow-card transition ${active ? "-translate-y-1 border-ink" : "border-hairline"}`}
      style={{ borderTop: `6px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div>
          <p className="font-mono text-2xl font-semibold">{degree.input}</p>
          {degree.input !== degree.chord ? <p className="font-mono text-xs text-ink-mute">= {degree.chord}{degree.approximated ? " (aprox.)" : ""}</p> : null}
        </div>
        <p className="font-display text-3xl leading-none" style={{ color }}>{degree.numeral}</p>
      </div>
      <p className="px-4">
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold text-on-primary" style={{ backgroundColor: color }}>
          {functionLabel(degree.function, degree.role)}
        </span>
      </p>
      <p className="px-4 pt-3 text-sm leading-6 text-ink-mute">{degree.explanation}</p>
      {degree.substitutions.length ? (
        <div className="mt-auto border-t border-hairline p-4 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
            {pending ? <>En la variante B: <span className="font-mono normal-case tracking-normal text-ink">{pending}</span></> : "Prueba en su lugar (variante B)"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {degree.substitutions.map(sub => (
              <button
                key={sub.chord}
                type="button"
                title={sub.reason}
                onClick={() => onReplace(pending === sub.chord ? degree.input : sub.chord)}
                aria-pressed={pending === sub.chord}
                className={`rounded-md border px-2 py-1 font-mono text-sm hover:border-ink ${pending === sub.chord ? "border-ink bg-primary text-on-primary" : "border-hairline bg-canvas-soft"}`}
              >
                {sub.chord}
                <span className={`ml-1 font-sans text-[10px] uppercase ${pending === sub.chord ? "text-on-dark-mute" : "text-ink-faint"}`}>{sub.kind}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </li>
  )
}

type CompareProps = {
  original: string[]
  variant: string[]
  analysisA: AnalyzeResponse["analysis"]
  analysisB: AnalyzeResponse["analysis"] | null
  loading: boolean
  error: string | null
  playingId: string | null
  playingIndex: number | null
  onPlay: (id: "A" | "B") => void
  onKeep: () => void
  onDiscard: () => void
  onSaveBoth: (() => void) | null
  saving: boolean
  user: boolean
}

/** Side-by-side A/B: original vs the variant built from substitutions. */
function CompareAB(props: CompareProps) {
  const { original, variant, analysisA, analysisB, loading, error, playingId, playingIndex, onPlay, onKeep, onDiscard, onSaveBoth, saving, user } = props
  const changed = new Set(changedIndices(original, variant))
  const delta = analysisB ? Math.round((analysisB.averageScore - analysisA.averageScore) * 10) / 10 : null
  const rows = [
    { id: "A" as const, title: "A · Original", chords: original, average: analysisA.averageScore },
    { id: "B" as const, title: "B · Variante", chords: variant, average: analysisB?.averageScore ?? null },
  ]

  return (
    <section aria-labelledby="compare-title" className="rounded-xl border-2 border-ink bg-canvas p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Comparar</p>
          <h3 id="compare-title" className="font-display text-2xl">¿A o B?</h3>
        </div>
        {delta !== null ? (
          <p className={`text-sm font-semibold ${delta >= 0 ? "text-fn-tonic" : "text-fn-dominant"}`}>
            {delta === 0 ? "Misma fluidez media" : delta > 0 ? `B es ${delta} puntos más fluida` : `B tiene ${Math.abs(delta)} puntos más de tensión`}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {rows.map(row => (
          <div key={row.id} className="flex flex-col gap-3 rounded-lg bg-canvas-soft p-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => onPlay(row.id)}
              disabled={row.id === "B" && !analysisB}
              className="min-h-11 shrink-0 rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-50"
            >
              {playingId === row.id ? "■" : "▶"} {row.id}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-mute">{row.title}</p>
              <p className="mt-1 flex flex-wrap gap-1.5 font-mono">
                {row.chords.map((chord, index) => (
                  <span
                    key={`${chord}-${index}`}
                    className={`rounded px-1.5 ${row.id === "B" && changed.has(index) ? "bg-surface-violet-soft/60 font-bold" : ""} ${playingId === row.id && playingIndex === index ? "ring-2 ring-ink" : ""}`}
                  >
                    {chord}
                  </span>
                ))}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm text-ink-mute">{row.average !== null ? `fluidez ${row.average}` : loading ? "analizando..." : "-"}</p>
          </div>
        ))}
      </div>

      {error ? <p role="alert" className="mt-3 text-sm text-fn-dominant">{error}</p> : null}

      {analysisB ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {Array.from(changed).map(index => {
            const before = analysisA.degrees[index]
            const after = analysisB.degrees[index]
            if (!after) return null
            return (
              <li key={index} className="rounded-lg border border-hairline p-3 text-sm">
                <p className="font-mono">
                  {before?.input ?? "—"} <span className="text-ink-mute">({before?.numeral})</span> → <strong>{after.input}</strong>{" "}
                  <span style={{ color: functionColor(after.function, after.role) }}>({after.numeral} · {functionLabel(after.function, after.role)})</span>
                </p>
                <p className="mt-1 text-ink-mute">{after.explanation}</p>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onKeep} disabled={!analysisB} className="min-h-11 rounded-md bg-surface-teal-deep px-4 font-bold text-on-primary hover:bg-surface-teal-mid disabled:opacity-50">Quedarme con B</button>
        {onSaveBoth ? (
          <button type="button" onClick={onSaveBoth} disabled={!analysisB || saving} className="min-h-11 rounded-md border border-ink/20 px-4 font-semibold hover:border-ink disabled:opacity-50">
            {user ? "Guardar A y B" : "Entrar y guardar A y B"}
          </button>
        ) : null}
        <button type="button" onClick={onDiscard} className="min-h-11 rounded-md px-4 font-semibold text-ink-mute hover:text-ink">Descartar variante</button>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { title: "Tonalidad y grados", body: "Cada acorde recibe su número romano (I, IV, V7/ii...) para que entiendas su papel, no solo cómo se toca." },
    { title: "Tensión y fluidez", body: "Un motor de siete criterios puntúa cada cambio: notas comunes, círculo de quintas, movimiento de voces y función tonal." },
    { title: "Sustituciones", body: "Relativos, préstamos modales, sustitutos tritonales y dominantes secundarias: un clic y la progresión se reescribe." },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <article key={step.title} className="rounded-xl border border-hairline bg-canvas p-6 shadow-card">
          <p className="font-mono text-sm text-ink-faint">0{index + 1}</p>
          <h2 className="mt-2 text-2xl">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-mute">{step.body}</p>
        </article>
      ))}
    </div>
  )
}
