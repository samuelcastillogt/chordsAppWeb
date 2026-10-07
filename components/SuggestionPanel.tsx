"use client"

import { useState } from "react"

import { categoryColor, connectionLabel } from "@/lib/music"
import { RankedSuggestion, STYLE_PRESETS, SUGGESTION_MODES, StylePreset, SuggestionMode, breakdownRows } from "@/lib/suggestions"

type Props = {
  source: string
  suggestions: RankedSuggestion[]
  mode: SuggestionMode
  preset: StylePreset
  onModeChange: (mode: SuggestionMode) => void
  onPresetChange: (preset: StylePreset) => void
  onSelect: (chord: string) => void
  onAdd: (chord: string) => void
  onPreview: (chord: string) => void
  previewing: string | null
  loading: boolean
}

/** "Qué puede seguir": intention modes, style presets and explained, audible suggestions. */
export default function SuggestionPanel(props: Props) {
  const { source, suggestions, mode, preset, onModeChange, onPresetChange, onSelect, onAdd, onPreview, previewing, loading } = props
  const [expanded, setExpanded] = useState<string | null>(null)
  const modeHint = SUGGESTION_MODES.find(item => item.id === mode)?.hint
  const presetHint = STYLE_PRESETS.find(item => item.id === preset)?.hint

  return (
    <div>
      <div role="radiogroup" aria-label="Intención" className="mt-4 grid grid-cols-4 gap-1 rounded-lg border border-hairline bg-canvas p-1">
        {SUGGESTION_MODES.map(item => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            onClick={() => onModeChange(item.id)}
            className={`min-h-10 rounded-md px-1 text-xs font-bold transition ${mode === item.id ? "bg-primary text-on-primary" : "text-ink-mute hover:bg-canvas-soft"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-mute">{modeHint}</p>

      <label className="mt-3 flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">
        Estilo
        <select
          value={preset}
          onChange={event => onPresetChange(event.target.value as StylePreset)}
          className="min-h-10 rounded-md border border-hairline bg-canvas px-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-ink"
        >
          {STYLE_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="mt-1 text-xs text-ink-mute">{presetHint}</p>

      <ul className="mt-4 max-h-[560px] space-y-2 overflow-auto pr-1 text-sm">
        {loading
          ? Array.from({ length: 4 }, (_, index) => <li key={index} className="h-24 animate-pulse rounded-md bg-hairline/60" />)
          : null}
        {!loading && suggestions.length === 0 ? (
          <li className="rounded-md border border-hairline bg-canvas p-4 text-ink-mute">No hay sugerencias con esta intención para {source}. Prueba otra.</li>
        ) : null}
        {!loading &&
          suggestions.map(suggestion => {
            const open = expanded === suggestion.target
            return (
              <li key={suggestion.target} className="rounded-md border border-hairline bg-canvas p-3 transition hover:border-ink/30">
                <button type="button" onClick={() => onSelect(suggestion.target)} className="flex min-h-8 w-full items-center justify-between gap-2 text-left">
                  <span>
                    <strong className="font-mono text-base">{suggestion.target}</strong>
                    <span className="ml-2 text-xs font-semibold" style={{ color: categoryColor(suggestion.category) }}>{connectionLabel(suggestion.category)}</span>
                  </span>
                  <span className="font-mono" title={preset === "balanced" ? "Puntuación del motor" : `Puntuación ${STYLE_PRESETS.find(item => item.id === preset)?.label} (motor: ${suggestion.score})`}>
                    {suggestion.rankScore}
                  </span>
                </button>
                {suggestion.explanation ? <p className="mt-1 text-xs leading-5 text-ink-mute">{suggestion.explanation}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => onAdd(suggestion.target)} className="min-h-9 rounded-md bg-primary px-3 text-xs font-bold text-on-primary hover:bg-primary-deep">Agregar</button>
                  <button
                    type="button"
                    onClick={() => onPreview(suggestion.target)}
                    aria-label={`Escuchar ${source} → ${suggestion.target}`}
                    className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink"
                  >
                    {previewing === suggestion.target ? "♪ Sonando" : `▶ ${source} → ${suggestion.target}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : suggestion.target)}
                    aria-expanded={open}
                    className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink"
                  >
                    {open ? "Ocultar" : "¿Por qué?"}
                  </button>
                </div>
                {open ? <Breakdown suggestion={suggestion} /> : null}
              </li>
            )
          })}
      </ul>
    </div>
  )
}

function Breakdown({ suggestion }: { suggestion: RankedSuggestion }) {
  return (
    <dl className="mt-3 space-y-2 border-t border-hairline pt-3">
      {breakdownRows(suggestion).map(row => (
        <div key={row.name}>
          <dt className="flex justify-between text-xs">
            <span className="font-semibold">{row.label}</span>
            <span className="font-mono text-ink-mute">{Math.round(row.raw)}</span>
          </dt>
          <dd className="mt-1">
            <div className="h-1.5 rounded-full bg-hairline">
              <div className="h-1.5 rounded-full bg-surface-teal-mid" style={{ width: `${Math.max(0, Math.min(row.raw, 100))}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-mute">{row.detail}</p>
          </dd>
        </div>
      ))}
    </dl>
  )
}
