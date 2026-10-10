"use client"

import Link from "next/link"
import { useState } from "react"

import ChordRow from "@/components/learn/ChordRow"
import { usePlayer } from "@/lib/audio/usePlayer"
import { CIRCLE_MAJORS, KEY_SIGNATURE, diatonicChords, keyName, relativeMinor } from "@/lib/music/keys"

const SIZE = 360
const C = SIZE / 2

function point(index: number, radius: number) {
  const angle = (index / 12) * 2 * Math.PI - Math.PI / 2
  return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) }
}

/** Interactive circle of fifths: pick a key and see its neighbours, its relative minor and its chords. */
export default function CircleOfFifths() {
  const [selected, setSelected] = useState(0)
  const player = usePlayer({ bpm: 96 })
  const tonic = CIRCLE_MAJORS[selected]
  const chords = diatonicChords(tonic, "major")
  const neighbours = new Set([(selected + 11) % 12, (selected + 1) % 12])
  const cadence = [chords[0], chords[3], chords[4], chords[0]]

  return (
    <div className="grid gap-6 rounded-xl border border-hairline bg-canvas p-5 shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[420px]" role="group" aria-label="Círculo de quintas">
        <circle cx={C} cy={C} r={170} fill="#16132a" />
        <circle cx={C} cy={C} r={118} fill="none" stroke="#3a3555" />
        <circle cx={C} cy={C} r={70} fill="#0d0b1a" stroke="#3a3555" />
        {CIRCLE_MAJORS.map((major, index) => {
          const outer = point(index, 145)
          const inner = point(index, 94)
          const isSelected = index === selected
          const isNeighbour = neighbours.has(index)
          return (
            <g
              key={major}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${keyName(major, "major")}, relativo ${relativeMinor(major)}m`}
              onClick={() => setSelected(index)}
              onKeyDown={event => (event.key === "Enter" || event.key === " ") && setSelected(index)}
              className="cursor-pointer outline-none"
            >
              <circle cx={outer.x} cy={outer.y} r={22} fill={isSelected ? "#f2c14e" : isNeighbour ? "#1f8a70" : "#26223f"} />
              <text
                x={outer.x}
                y={outer.y + 6}
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill={isSelected ? "#16132a" : "#fbf7ef"}
                fontFamily="var(--font-mono)"
              >
                {major}
              </text>
              <text x={inner.x} y={inner.y + 5} textAnchor="middle" fontSize="13" fill={isSelected ? "#f2c14e" : "#c9c3da"} fontFamily="var(--font-mono)">
                {relativeMinor(major)}m
              </text>
            </g>
          )
        })}
        <text x={C} y={C - 4} textAnchor="middle" fontSize="15" fill="#c9c3da">
          Mayores fuera
        </text>
        <text x={C} y={C + 16} textAnchor="middle" fontSize="15" fill="#c9c3da">
          menores dentro
        </text>
      </svg>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tonalidad elegida</p>
          <h3 className="mt-1 text-3xl">{keyName(tonic, "major")}</h3>
          <p className="mt-1 text-sm text-ink-mute">
            Armadura: {KEY_SIGNATURE[tonic]} · Relativa menor: {keyName(relativeMinor(tonic), "minor")}
          </p>
        </div>
        <p className="text-sm text-ink-mute">
          Sus vecinas en verde son {CIRCLE_MAJORS[(selected + 11) % 12]} (el IV) y {CIRCLE_MAJORS[(selected + 1) % 12]} (el V): comparten seis de sus siete
          notas, por eso modular hacia ellas suena natural.
        </p>
        <ChordRow chords={chords} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => (player.isPlaying ? player.stop() : player.play(cadence.map(c => c.notes)))}
            className="min-h-11 rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep"
          >
            {player.isPlaying ? "■ Detener" : "▶ Escuchar I – IV – V – I"}
          </button>
          <Link
            href={`/explorer?chords=${encodeURIComponent(cadence.map(c => c.chord).join(","))}&key=${encodeURIComponent(tonic)}`}
            className="inline-flex min-h-11 items-center rounded-md border border-hairline px-4 font-semibold hover:border-ink"
          >
            Explorar en {tonic} →
          </Link>
        </div>
      </div>
    </div>
  )
}
