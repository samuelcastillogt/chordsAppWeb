"use client"

import Link from "next/link"

import { SavedStyle, StyleSuggestResponse } from "@/types"

type Props = {
  styles: SavedStyle[]
  activeId: string | null
  weight: number
  onChange: (id: string | null) => void
  onWeightChange: (weight: number) => void
  suggestion: StyleSuggestResponse | undefined
  loading: boolean
  error: string | null
  playingId: string | null
  onPlayPhrase: (chords: string[]) => void
  onStop: () => void
  onAddPhrase: (chords: string[]) => void
}

/** "Componer como…": pick a learned band style and how much it should steer the suggestions. */
export default function StylePicker(props: Props) {
  const { styles, activeId, weight, onChange, onWeightChange, suggestion, loading, error, playingId, onPlayPhrase, onStop, onAddPhrase } = props
  const active = styles.find(item => item.id === activeId) ?? null
  const phrase = suggestion?.phrase ?? []
  const phraseChords = phrase.map(step => step.chord)
  const playing = playingId === "style:phrase"

  return (
    <div className="mt-4 rounded-lg border border-hairline bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="band-style" className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Componer como</label>
        <Link href="/estilo" className="text-xs font-bold text-ink underline underline-offset-4">{styles.length ? "Gestionar estilos" : "Crear un estilo"}</Link>
      </div>
      <select
        id="band-style"
        value={activeId ?? ""}
        onChange={event => onChange(event.target.value || null)}
        className="mt-1 min-h-10 w-full rounded-md border border-hairline bg-canvas px-2 text-sm text-ink outline-none focus:border-ink"
      >
        <option value="">Sin estilo (solo teoría)</option>
        {styles.map(item => (
          <option key={item.id} value={item.id}>{item.profile.name} · {item.profile.songs.length} canciones</option>
        ))}
      </select>
      {!styles.length ? <p className="mt-2 text-xs leading-5 text-ink-mute">Pega cifrados o tablaturas de una banda y aprende sus patrones para que las sugerencias suenen como ellos.</p> : null}

      {active ? (
        <>
          <label className="mt-3 flex flex-col gap-1 text-xs text-ink-mute">
            <span className="flex justify-between"><span>Teoría</span><strong className="text-ink">{Math.round(weight * 100)}% {active.profile.name}</strong><span>Banda</span></span>
            <input type="range" min={0} max={1} step={0.05} value={weight} onChange={event => onWeightChange(Number(event.target.value))} className="accent-[#7b5cd6]" aria-label={`Peso del estilo de ${active.profile.name}`} />
          </label>
          {error ? <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}
          {suggestion?.context.length ? <p className="mt-2 text-xs text-ink-mute">Contexto: <span className="font-display text-ink">{suggestion.context.join(" → ")}</span> en {suggestion.key}</p> : null}
          {phrase.length ? (
            <div className="mt-2 rounded-md bg-canvas-soft p-2 text-xs">
              <p className="font-semibold text-ink">Así seguiría {active.profile.name}</p>
              <p className="mt-1 font-mono text-sm font-semibold">{phrase.map(step => step.chord).join(" → ")}</p>
              <p className="font-display text-ink-mute">{phrase.map(step => step.numeral).join(" → ")}</p>
              <div className="mt-2 flex gap-1.5">
                <button type="button" onClick={() => (playing ? onStop() : onPlayPhrase(phraseChords))} className="min-h-8 rounded-md border border-hairline px-2 font-semibold hover:border-ink">{playing ? "■ Detener" : "▶ Escuchar"}</button>
                <button type="button" onClick={() => onAddPhrase(phraseChords)} className="min-h-8 rounded-md bg-primary px-2 font-bold text-on-primary hover:bg-primary-deep">Agregar frase</button>
              </div>
            </div>
          ) : loading ? <div className="mt-2 h-16 animate-pulse rounded-md bg-hairline/60" /> : null}
        </>
      ) : null}
    </div>
  )
}
