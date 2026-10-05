"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import InstrumentRecommendations from "@/components/InstrumentRecommendations"
import { get, getApiBaseUrl } from "@/lib/api"
import { buildGuitarFretboard, findCompatibleChords } from "@/lib/music"
import { Chord, ConnectionsResponse } from "@/types"

const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15])

export default function FretboardExplorer() {
  const [pressedPositions, setPressedPositions] = useState<Record<string, string>>({})
  const [selectedCompatibleId, setSelectedCompatibleId] = useState<string | null>(null)

  const { data: chords = [], isLoading, error } = useQuery<Chord[]>({
    queryKey: ["chords"],
    queryFn: () => get<Chord[]>("/api/v1/chords"),
  })

  const pressedNotes = useMemo(() => Object.values(pressedPositions), [pressedPositions])
  const compatibleChords = useMemo(() => findCompatibleChords(chords, pressedNotes), [chords, pressedNotes])
  const selectedCompatible = compatibleChords.find(match => match.chord.id === selectedCompatibleId)?.chord ?? compatibleChords[0]?.chord ?? null

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery<ConnectionsResponse>({
    queryKey: ["instrument-connections", selectedCompatible?.id],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${encodeURIComponent(selectedCompatible!.id)}/connections`, { min_score: 0, max_results: 12 }),
    enabled: !!selectedCompatible,
  })

  const fretboard = buildGuitarFretboard("C", [], 15)

  function togglePosition(key: string, note: string) {
    setSelectedCompatibleId(null)
    setPressedPositions(current => {
      const next = { ...current }
      if (next[key]) delete next[key]
      else next[key] = note
      return next
    })
  }

  function clearSelection() {
    setPressedPositions({})
    setSelectedCompatibleId(null)
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
        <section className="max-w-lg rounded-lg border border-hairline bg-canvas p-8 text-center shadow-sm">
          <h1 className="text-[28px] font-[540] tracking-[-0.63px] text-ink">No se pudo conectar con la API</h1>
          <p className="mt-3 text-sm text-ink-mute">Verifica que el backend esté corriendo en {getApiBaseUrl()}.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas-soft text-ink">
      <section className="bg-primary text-on-primary">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/explorer" className="text-sm font-bold text-on-dark-mute hover:text-on-primary">Volver al explorador</Link>
          <p className="mt-8 text-xs font-[540] uppercase tracking-[0.32em] text-on-dark-mute">Mástil interactivo</p>
          <h1 className="mt-4 max-w-3xl text-[44px] font-[540] leading-[0.96] tracking-[-1px] md:text-[64px]">Presiona cuerdas y descubre hacia que acorde moverte.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-on-dark-mute">Selecciona cualquier punto del mastil. El sistema identifica acordes que contienen esas notas y usa el motor armonico para recomendar los siguientes movimientos.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="rounded-lg border border-hairline bg-canvas p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Guitarra</p>
              <h2 className="mt-2 text-[40px] font-[460] leading-none tracking-[-1px]">Afinación estándar</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-ink-mute">Puedes moverte por todos los trastes visibles. Los puntos presionados se iluminan; el resto del mastil se mantiene neutro.</p>
          </div>

          {isLoading ? (
            <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-md bg-canvas-soft text-ink-mute">Cargando catálogo...</div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg bg-canvas-soft p-4">
              <div className="grid min-w-[980px] gap-2" style={{ gridTemplateColumns: "48px repeat(16, minmax(48px, 1fr))" }}>
                <div />
                {Array.from({ length: 16 }, (_, fret) => (
                  <div key={`fret-${fret}`} className="text-center text-xs font-bold text-ink-mute">{fret === 0 ? "Aire" : fret}</div>
                ))}

                {fretboard.map((positions, stringIndex) => (
                  <div key={`${positions[0].stringName}-${stringIndex}`} className="contents">
                    <div className="flex items-center justify-center font-mono text-sm font-bold text-ink-mute">{positions[0].stringName}</div>
                    {positions.map(position => {
                      const key = `${stringIndex}-${position.fret}`
                      const isPressed = pressedPositions[key] !== undefined

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePosition(key, position.note)}
                          className="relative flex min-h-[58px] items-center justify-center border-l border-hairline last:border-r focus:outline-none focus:ring-2 focus:ring-surface-violet-soft"
                          aria-pressed={isPressed}
                          aria-label={`Cuerda ${position.stringName}, traste ${position.fret}, nota ${position.note}`}
                        >
                          <span className="absolute left-0 right-0 top-1/2 h-px bg-ink-mute/40" />
                          {FRET_MARKERS.has(position.fret) && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-ink-mute/30" />}
                          <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold transition ${isPressed ? "scale-110 border-surface-violet-soft bg-surface-violet-soft text-primary shadow-[0_0_22px_rgba(201,180,250,0.9)]" : "border-neutral-300 bg-neutral-200 text-neutral-500"}`}>
                            {position.note}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <InstrumentRecommendations
          pressedNotes={pressedNotes}
          compatibleChords={compatibleChords}
          selectedChord={selectedCompatible}
          connections={connectionsData?.connections ?? []}
          isLoadingConnections={connectionsLoading}
          onSelectChord={setSelectedCompatibleId}
          onClear={clearSelection}
        />
      </section>
    </main>
  )
}
