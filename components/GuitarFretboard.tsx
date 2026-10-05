import { buildGuitarFretboard, getIntervalName } from "@/lib/music"
import { Chord } from "@/types"

type GuitarFretboardProps = {
  chord: Chord | null
  activeNotes: string[]
  onPlay: () => void
}

const FRET_MARKERS = new Set([3, 5, 7, 9, 12])

export default function GuitarFretboard({ chord, activeNotes, onPlay }: GuitarFretboardProps) {
  if (!chord) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-hairline bg-canvas p-6 text-center text-ink-mute">
        Selecciona un acorde para ver sus intervalos en el mastil.
      </div>
    )
  }

  const activeSet = new Set(activeNotes)
  const strings = buildGuitarFretboard(chord.root, chord.triad)

  return (
    <section className="rounded-md border border-hairline bg-canvas p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Mástil de guitarra</p>
          <h3 className="mt-2 text-[32px] font-[540] leading-none tracking-[-0.8px] text-ink">{chord.id}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-mute">
            Las notas de la triada aparecen como intervalos. Cuando suenan se iluminan; si no estan sonando permanecen en gris.
          </p>
        </div>
        <button type="button" onClick={onPlay} className="min-h-11 rounded-md bg-primary px-5 text-sm font-bold text-on-primary hover:bg-primary-deep">
          Reproducir acorde
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg bg-canvas-soft p-4">
        <div className="grid min-w-[820px] gap-2" style={{ gridTemplateColumns: "48px repeat(13, minmax(48px, 1fr))" }}>
          <div />
          {Array.from({ length: 13 }, (_, fret) => (
            <div key={`fret-${fret}`} className="text-center text-xs font-bold text-ink-mute">
              {fret === 0 ? "Aire" : fret}
            </div>
          ))}

          {strings.map((positions, stringIndex) => (
            <div key={`${positions[0].stringName}-${stringIndex}`} className="contents">
              <div className="flex items-center justify-center font-mono text-sm font-bold text-ink-mute">{positions[0].stringName}</div>
              {positions.map(position => {
                const isActive = position.isChordTone && activeSet.has(position.note)
                const isMutedChordTone = position.isChordTone && !isActive

                return (
                  <div key={`${position.stringName}-${stringIndex}-${position.fret}`} className="relative flex min-h-[58px] items-center justify-center border-l border-hairline last:border-r">
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-ink-mute/40" />
                    {FRET_MARKERS.has(position.fret) && <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-ink-mute/30" />}
                    {position.isChordTone && (
                      <div
                        className={`relative z-10 flex h-11 w-11 flex-col items-center justify-center rounded-full border text-[10px] font-bold leading-tight shadow-sm transition-all duration-200 ${
                          isActive
                            ? "scale-110 border-surface-violet-soft bg-surface-violet-soft text-primary shadow-[0_0_24px_rgba(201,180,250,0.9)]"
                            : "border-hairline bg-neutral-200 text-neutral-500"
                        }`}
                        title={`${position.note}: ${position.interval}`}
                      >
                        <span>{position.interval}</span>
                        <span className={isMutedChordTone ? "text-neutral-400" : "text-primary/80"}>{position.note}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-mute">
        {chord.triad.map(note => (
          <span key={note} className={`rounded-full border px-3 py-2 font-bold ${activeSet.has(note) ? "border-surface-violet-soft bg-surface-violet-soft text-primary" : "border-hairline bg-neutral-100 text-neutral-500"}`}>
            {note} · {getIntervalName(chord.root, note)}
          </span>
        ))}
      </div>
    </section>
  )
}
