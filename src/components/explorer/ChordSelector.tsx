"use client"

import { Chord } from "@/types"

interface Props {
  label: string
  chords: Chord[]
  value: string
  onChange: (value: string) => void
}

export default function ChordSelector({ label, chords, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-on-dark-mute" htmlFor={`selector-${label}`}>
        {label}
      </label>
      <select
        id={`selector-${label}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="min-h-11 rounded-md border border-hairline-dark bg-primary px-3 py-2 text-sm text-on-primary outline-none transition focus:border-surface-violet-soft focus:ring-2 focus:ring-surface-violet-soft/30"
      >
        {chords.map(chord => (
          <option key={chord.id} value={chord.id}>
            {chord.id} · {chord.type}
          </option>
        ))}
      </select>
    </div>
  )
}
