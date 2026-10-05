"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import TensionCurve from "@/components/TensionCurve"
import { playSequence } from "@/lib/audio"
import { get, post } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { functionColor, functionLabel, splitChordInput } from "@/lib/music"
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
  const [playing, setPlaying] = useState<number | null>(null)
  const [saveName, setSaveName] = useState(fromSong ?? "")
  const [notice, setNotice] = useState<string | null>(null)

  const { data: catalog = [] } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const notesById = useMemo(() => new Map(catalog.map(chord => [chord.id, chord.notes ?? chord.triad])), [catalog])

  const analysisQuery = useQuery({
    queryKey: ["analysis", submitted],
    enabled: !!submitted,
    retry: false,
    queryFn: async (): Promise<{ parsed: Parsed; response: AnalyzeResponse }> => {
      const { text, key } = submitted!
      const symbols = splitChordInput(text)
      if (symbols.length < 2) throw new Error("Escribe al menos dos acordes, por ejemplo: Am F C G")
      const { results } = await post<{ results: ParsedChord[] }>("/api/v1/chords/parse", { symbols })
      const recognized = results.filter(result => result.chord)
      const ignored = results.filter(result => !result.chord).map(result => result.input)
      if (recognized.length < 2) throw new Error("No reconocí suficientes acordes. Revisa la escritura (ej.: Bm, F#m7, D/F#, SOLm).")
      const response = await post<AnalyzeResponse>("/api/v1/analyze", { chords: recognized.map(item => item.input), tonality: key || undefined })
      return { parsed: { recognized, ignored }, response }
    },
  })
  const parsed = analysisQuery.data?.parsed ?? null

  const tablatureMutation = useMutation({
    mutationFn: (chords: string[]) => post<TablatureResponse>("/api/v1/tablature", { chords, title: saveName || "Progresión" }),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { chords: string[]; tonality: string }) =>
      post<Progression>("/api/v1/progressions", {
        name: saveName.trim() || "Progresión sin nombre",
        chords: payload.chords,
        tonality: payload.tonality,
        source: source?.slice(0, 200) ?? null,
      }),
    onSuccess: () => {
      setNotice("Guardada en tu biblioteca.")
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
  })

  function run(text = input, key = keyOverride) {
    setNotice(null)
    tablatureMutation.reset()
    saveMutation.reset()
    setSubmitted({ text: text.trim(), key })
  }

  const analysis = analysisQuery.data?.response.analysis
  const progressionChords = analysis?.chords ?? []

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    run()
  }

  function replaceChord(index: number, replacement: string) {
    const symbols = parsed?.recognized.map(item => item.input) ?? []
    symbols[index] = replacement
    const text = symbols.join(" ")
    setInput(text)
    run(text, keyOverride)
  }

  function play() {
    playSequence(progressionChords.map(id => notesById.get(id) ?? []), setPlaying)
  }

  function save() {
    if (!analysis) return
    if (!user) {
      openDialog()
      return
    }
    saveMutation.mutate({ chords: analysis.chords, tonality: analysis.key.id })
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
                <button type="button" onClick={play} className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep">▶ Escuchar</button>
                <Link href={explorerHref} className="inline-flex min-h-11 items-center rounded-md border border-ink/20 bg-canvas px-5 font-bold hover:border-ink">Explorar qué sigue</Link>
                <button type="button" onClick={() => tablatureMutation.mutate(analysis.chords)} className="min-h-11 rounded-md border border-ink/20 bg-canvas px-5 font-bold hover:border-ink">
                  {tablatureMutation.isPending ? "Generando..." : "Tablatura"}
                </button>
              </div>
            </div>

            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analysis.degrees.map((degree, index) => (
                <DegreeCard key={`${degree.input}-${index}`} degree={degree} active={playing === index} onReplace={replacement => replaceChord(index, replacement)} />
              ))}
            </ol>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card">
                <h3 className="font-display text-2xl">Fluidez de cada cambio</h3>
                <p className="mb-4 mt-1 text-sm text-ink-mute">Promedio {analysis.averageScore}/100</p>
                <TensionCurve points={analysis.tensionCurve} chords={analysis.degrees.map(degree => degree.input)} />
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
                      <button type="button" onClick={save} disabled={saveMutation.isPending} className="min-h-11 rounded-md bg-surface-teal-deep px-4 font-bold text-on-primary hover:bg-surface-teal-mid disabled:opacity-60">
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

function DegreeCard({ degree, active, onReplace }: { degree: Degree; active: boolean; onReplace: (chord: string) => void }) {
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Prueba en su lugar</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {degree.substitutions.map(sub => (
              <button
                key={sub.chord}
                type="button"
                title={sub.reason}
                onClick={() => onReplace(sub.chord)}
                className="rounded-md border border-hairline bg-canvas-soft px-2 py-1 font-mono text-sm hover:border-ink"
              >
                {sub.chord}
                <span className="ml-1 font-sans text-[10px] uppercase text-ink-faint">{sub.kind}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </li>
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
