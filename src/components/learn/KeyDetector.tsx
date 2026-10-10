"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"

import { track } from "@/lib/analytics"
import { post } from "@/lib/api"
import { functionColor, functionLabel, splitChordInput } from "@/lib/music/theory"
import { AnalyzeResponse, ParsedChord } from "@/types"

type Result = { analysis: AnalyzeResponse["analysis"]; ignored: string[] }

/** Paste chords, get the key: the analyzer's key detection on its own. */
export default function KeyDetector() {
  const [text, setText] = useState("Am F C G")
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function detect(event: FormEvent) {
    event.preventDefault()
    const symbols = splitChordInput(text)
    if (symbols.length < 2) {
      setError("Escribe al menos dos acordes, por ejemplo: Am F C G")
      return
    }
    setPending(true)
    setError(null)
    try {
      const { results } = await post<{ results: ParsedChord[] }>("/api/v1/chords/parse", { symbols })
      const recognized = results.filter(r => r.chord).map(r => r.input)
      if (recognized.length < 2) throw new Error("No reconocí suficientes acordes. Revisa la escritura (ej.: Bm, F#m7, SOLm).")
      const { analysis } = await post<AnalyzeResponse>("/api/v1/analyze", { chords: recognized })
      setResult({ analysis, ignored: results.filter(r => !r.chord).map(r => r.input) })
      track("analyze", { placement: "key-detector", chords: recognized.length })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo detectar la tonalidad")
    } finally {
      setPending(false)
    }
  }

  const confidence = result ? Math.round(result.analysis.key.confidence * 100) : 0

  return (
    <div className="rounded-xl border border-hairline bg-canvas p-5 shadow-card">
      <form onSubmit={detect} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="detector-input" className="sr-only">
          Acordes de la canción
        </label>
        <input
          id="detector-input"
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Ej.: Bm G D A o SOL RE Mim DO"
          className="min-h-12 flex-1 rounded-md border border-hairline px-4 font-mono text-lg outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-md bg-primary px-6 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-60"
        >
          {pending ? "Detectando…" : "Detectar tonalidad"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-fn-dominant">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-5 flex flex-col gap-4" aria-live="polite">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tonalidad</p>
            <p className="mt-1 font-display text-4xl">{result.analysis.key.label}</p>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="h-2 w-40 overflow-hidden rounded-full bg-hairline"
                role="meter"
                aria-valuenow={confidence}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Confianza"
              >
                <div className="h-full rounded-full bg-fn-tonic" style={{ width: `${confidence}%` }} />
              </div>
              <span className="text-sm text-ink-mute">Confianza {confidence}%</span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2">
            {result.analysis.degrees.map((degree, index) => (
              <li
                key={`${degree.input}-${index}`}
                className="rounded-lg border border-hairline px-3 py-2 text-center"
                style={{ borderTop: `5px solid ${functionColor(degree.function, degree.role)}` }}
              >
                <span className="block font-mono font-semibold">{degree.input}</span>
                <span className="block font-display text-lg" style={{ color: functionColor(degree.function, degree.role) }}>
                  {degree.numeral}
                </span>
                <span className="block text-[11px] text-ink-mute">{functionLabel(degree.function, degree.role)}</span>
              </li>
            ))}
          </ul>
          {result.ignored.length ? <p className="text-sm text-ink-mute">No reconocí: {result.ignored.join(", ")}</p> : null}
          <Link
            href={`/?chords=${encodeURIComponent(splitChordInput(text).join(","))}`}
            className="inline-flex min-h-11 w-fit items-center rounded-md bg-surface-teal-deep px-5 font-bold text-on-primary hover:bg-surface-teal-mid"
          >
            Ver el análisis completo →
          </Link>
        </div>
      ) : null}
    </div>
  )
}
