"use client"

import { displayName } from "@/lib/music/keys"
import { functionColor, functionLabel } from "@/lib/music/theory"

/** A row of chord cards with their degree, coloured by harmonic function (same look as the analyzer). */
export default function ChordRow({ chords, active }: { chords: Array<{ chord: string; degree: string; fn: string | null }>; active?: number | null }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Acordes">
      {chords.map((item, index) => {
        const color = functionColor(item.fn)
        const on = active === index
        return (
          <li
            key={`${item.chord}-${index}`}
            className={`min-w-[4.5rem] rounded-lg border px-3 py-2 text-center transition ${on ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas"}`}
            style={{ borderTop: `5px solid ${color}` }}
          >
            <span className="block font-mono text-lg font-semibold">{displayName(item.chord)}</span>
            <span className="block font-display text-xl" style={{ color: on ? undefined : color }}>
              {item.degree}
            </span>
            <span className="sr-only">{functionLabel(item.fn)}</span>
          </li>
        )
      })}
    </ol>
  )
}
