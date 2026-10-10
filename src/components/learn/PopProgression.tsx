"use client"

import Link from "next/link"
import { useState } from "react"

import ChordRow from "@/components/learn/ChordRow"
import { usePlayer } from "@/lib/audio/usePlayer"
import { CIRCLE_MAJORS, LATIN, diatonicChords } from "@/lib/music/keys"

/** Orderings of the same four chords (indexes into the major key's degrees). */
const ORDERS = [
  { id: "pop", label: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  { id: "sensitive", label: "vi – IV – I – V", degrees: [5, 3, 0, 4] },
  { id: "doowop", label: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
]

/** The four-chord progression in any key, with its common rotations, to hear and take to the analyzer. */
export default function PopProgression() {
  const [tonic, setTonic] = useState("C")
  const [orderId, setOrderId] = useState("pop")
  const player = usePlayer({ bpm: 100, loop: true })
  const key = diatonicChords(tonic, "major")
  const order = ORDERS.find(o => o.id === orderId) ?? ORDERS[0]
  const chords = order.degrees.map(index => key[index])

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-canvas p-5 shadow-card">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tonalidad</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tonalidad">
          {CIRCLE_MAJORS.map(major => (
            <button
              key={major}
              type="button"
              role="radio"
              aria-checked={tonic === major}
              onClick={() => {
                player.stop()
                setTonic(major)
              }}
              className={`min-h-10 min-w-11 rounded-full border px-3 font-mono font-semibold ${tonic === major ? "border-primary bg-primary text-on-primary" : "border-hairline hover:border-ink"}`}
              title={`${LATIN[major]} mayor`}
            >
              {major}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Orden</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Orden de los acordes">
          {ORDERS.map(o => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={orderId === o.id}
              onClick={() => {
                player.stop()
                setOrderId(o.id)
              }}
              className={`min-h-10 rounded-full border px-4 font-semibold ${orderId === o.id ? "border-primary bg-primary text-on-primary" : "border-hairline hover:border-ink"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <ChordRow chords={chords} active={player.current} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (player.isPlaying ? player.stop() : player.play(chords.map(c => c.notes)))}
          className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep"
        >
          {player.isPlaying ? "■ Detener" : "▶ Escuchar en bucle"}
        </button>
        <Link
          href={`/?chords=${encodeURIComponent(chords.map(c => c.chord).join(","))}`}
          className="inline-flex min-h-11 items-center rounded-md border border-hairline px-4 font-semibold hover:border-ink"
        >
          Analizar en ChordWeaver →
        </Link>
      </div>
    </div>
  )
}
