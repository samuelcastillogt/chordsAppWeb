"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import InstrumentRecommendations from "@/components/instruments/InstrumentRecommendations"
import { get, getApiBaseUrl } from "@/lib/api"
import { CHROMATIC_NOTES, findCompatibleChords } from "@/lib/music/theory"
import { Chord, ConnectionsResponse } from "@/types"

const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"]
const BLACK_NOTE_BY_SLOT: Record<string, string> = {
  C: "C#",
  D: "D#",
  F: "F#",
  G: "G#",
  A: "A#",
}

function buildPianoKeys(octaves = [3, 4, 5]) {
  return octaves.flatMap(octave => CHROMATIC_NOTES.map(note => ({ id: `${note}-${octave}`, note, octave })))
}

export default function PianoExplorer() {
  const [pressedKeys, setPressedKeys] = useState<Record<string, string>>({})
  const [selectedCompatibleId, setSelectedCompatibleId] = useState<string | null>(null)

  const {
    data: chords = [],
    isLoading,
    error,
  } = useQuery<Chord[]>({
    queryKey: ["chords"],
    queryFn: () => get<Chord[]>("/api/v1/chords"),
  })

  const pressedNotes = useMemo(() => Object.values(pressedKeys), [pressedKeys])
  const compatibleChords = useMemo(() => findCompatibleChords(chords, pressedNotes), [chords, pressedNotes])
  const selectedCompatible = compatibleChords.find(match => match.chord.id === selectedCompatibleId)?.chord ?? compatibleChords[0]?.chord ?? null
  const pianoKeys = buildPianoKeys()

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery<ConnectionsResponse>({
    queryKey: ["instrument-connections", selectedCompatible?.id],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${encodeURIComponent(selectedCompatible!.id)}/connections`, { min_score: 0, max_results: 12 }),
    enabled: !!selectedCompatible,
  })

  function toggleKey(keyId: string, note: string) {
    setSelectedCompatibleId(null)
    setPressedKeys(current => {
      const next = { ...current }
      if (next[keyId]) delete next[keyId]
      else next[keyId] = note
      return next
    })
  }

  function clearSelection() {
    setPressedKeys({})
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
      <section className="bg-surface-teal-deep text-on-primary">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/explorer" className="text-sm font-bold text-on-dark-mute hover:text-on-primary">
            Volver al explorador
          </Link>
          <p className="mt-8 text-xs font-[540] uppercase tracking-[0.32em] text-on-dark-mute">Piano interactivo</p>
          <h1 className="mt-4 max-w-3xl text-[44px] font-[540] leading-[0.96] tracking-[-1px] md:text-[64px]">Toca teclas y encuentra acordes compatibles.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-on-dark-mute">
            Presiona notas en cualquier octava visible. La compatibilidad se calcula por clase de nota, para que `C3`, `C4` y `C5` funcionen como `C`.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="rounded-lg border border-hairline bg-canvas p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Piano</p>
              <h2 className="mt-2 text-[40px] font-[460] leading-none tracking-[-1px]">Tres octavas</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-ink-mute">
              Las teclas presionadas se iluminan. Las no activas permanecen grises para mantener clara la lectura de compatibilidad.
            </p>
          </div>

          {isLoading ? (
            <div className="mt-6 flex min-h-[360px] items-center justify-center rounded-md bg-canvas-soft text-ink-mute">Cargando catálogo...</div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl bg-canvas-soft p-5">
              <div className="relative flex min-w-[980px] items-start pb-4">
                {pianoKeys
                  .filter(key => WHITE_NOTES.includes(key.note))
                  .map(key => {
                    const isPressed = pressedKeys[key.id] !== undefined

                    return (
                      <button
                        key={key.id}
                        type="button"
                        onClick={() => toggleKey(key.id, key.note)}
                        className={`relative flex h-72 w-[46px] items-end justify-center border border-hairline pb-4 text-xs font-bold transition focus:z-20 focus:outline-none focus:ring-2 focus:ring-surface-violet-soft ${isPressed ? "bg-surface-violet-soft text-primary shadow-[0_0_24px_rgba(201,180,250,0.9)]" : "bg-neutral-100 text-neutral-500 hover:bg-white"}`}
                        aria-pressed={isPressed}
                        aria-label={`Tecla ${key.note}${key.octave}`}
                      >
                        {key.note}
                        {key.octave}
                      </button>
                    )
                  })}

                <div className="pointer-events-none absolute left-0 top-0 flex">
                  {[3, 4, 5].flatMap(octave =>
                    WHITE_NOTES.map((whiteNote, slot) => {
                      const blackNote = BLACK_NOTE_BY_SLOT[whiteNote]
                      if (!blackNote) return null
                      const keyId = `${blackNote}-${octave}`
                      const isPressed = pressedKeys[keyId] !== undefined
                      const left = octave === 3 ? slot * 46 + 29 : (WHITE_NOTES.length * (octave - 3) + slot) * 46 + 29

                      return (
                        <button
                          key={keyId}
                          type="button"
                          onClick={() => toggleKey(keyId, blackNote)}
                          className={`pointer-events-auto absolute top-0 z-10 flex h-44 w-8 items-end justify-center rounded-b-md pb-3 text-[10px] font-bold transition focus:outline-none focus:ring-2 focus:ring-surface-violet-soft ${isPressed ? "bg-surface-violet-soft text-primary shadow-[0_0_24px_rgba(201,180,250,0.9)]" : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"}`}
                          style={{ left }}
                          aria-pressed={isPressed}
                          aria-label={`Tecla ${blackNote}${octave}`}
                        >
                          {blackNote}
                          {octave}
                        </button>
                      )
                    }),
                  )}
                </div>
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
