"use client"

import { useEffect, useRef } from "react"

import { MAX_FRET, STANDARD_TUNING, STRING_NAMES, Shape, intervalLabel, noteName, shapePosition } from "@/lib/music/guitar"

type Props = {
  shape: Shape
  onChange: (shape: Shape) => void
  /** A shape previewed over the current one (the next chord): dashed where fingers would go. */
  ghost?: Shape | null
  rootPc: number | null
  chordType?: string
  labels: "notes" | "intervals"
  /** Chord tones to show faintly across the whole neck (arpeggio map); null hides it. */
  mapTones: Set<number> | null
}

const FRETS = Array.from({ length: MAX_FRET }, (_, i) => i + 1)
const SINGLE_MARKERS = new Set([3, 5, 7, 9, 15])
// Tab convention: high e on top.
const STRINGS_TOP_DOWN = [5, 4, 3, 2, 1, 0]

/** Interactive neck: one finger per string, tap the nut to switch between open (○) and muted (×). */
export default function GuitarNeck({ shape, onChange, ghost, rootPc, chordType, labels, mapTones }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const position = shapePosition(shape)

  // On narrow screens the neck scrolls: bring the hand into view when it moves or the screen resizes.
  useEffect(() => {
    const bringIntoView = (behavior: ScrollBehavior) => {
      const element = scroller.current
      if (!element || element.scrollWidth <= element.clientWidth) return
      const fretWidth = (element.scrollWidth - 56) / MAX_FRET
      element.scrollTo({ left: Math.max(0, (position - 2) * fretWidth), behavior })
    }
    // Instant on first paint and on resize (a smooth scroll started while mounting gets dropped).
    bringIntoView(mounted.current ? "smooth" : "auto")
    mounted.current = true
    const onResize = () => bringIntoView("auto")
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [position])

  const label = (pitchClass: number) => (labels === "intervals" && rootPc !== null ? intervalLabel(rootPc, pitchClass, chordType) : noteName(pitchClass))

  function setFret(string: number, fret: number | null) {
    const next = [...shape]
    next[string] = fret
    onChange(next)
  }

  return (
    <div ref={scroller} className="overflow-x-auto rounded-lg bg-canvas-soft p-3" role="group" aria-label="Mástil de guitarra, afinación estándar">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${MAX_FRET}, minmax(46px, 1fr))` }}>
        {STRINGS_TOP_DOWN.map(string => {
          const fret = shape[string]
          const ghostFret = ghost ? ghost[string] : undefined
          const openPc = STANDARD_TUNING[string] % 12
          const thickness = 1 + (5 - string) * 0.35
          return (
            <div key={string} className="contents">
              {/* Nut: open / muted toggle */}
              <button
                type="button"
                onClick={() => setFret(string, fret === 0 ? null : 0)}
                aria-label={`Cuerda ${STRING_NAMES[string]}: ${fret === 0 ? "al aire" : fret === null ? "apagada" : `traste ${fret}`}. Cambiar a ${fret === 0 ? "apagada" : "al aire"}`}
                className="relative flex h-12 items-center justify-end gap-1.5 border-r-[6px] border-ink/70 pr-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-violet-soft"
              >
                <span className="font-mono text-xs font-bold text-ink-mute">{STRING_NAMES[string]}</span>
                <NutMark
                  state={fret === 0 ? "open" : fret === null ? "muted" : "fretted"}
                  ghost={ghostFret === undefined || ghostFret === fret ? null : ghostFret === 0 ? "open" : ghostFret === null ? "muted" : null}
                  root={fret === 0 && openPc === rootPc}
                  label={fret === 0 ? label(openPc) : null}
                />
              </button>
              {FRETS.map(position => {
                const pitchClass = (STANDARD_TUNING[string] + position) % 12
                const pressed = fret === position
                const ghosted = ghostFret === position
                const isRoot = pitchClass === rootPc
                const mapped = !pressed && !ghosted && mapTones?.has(pitchClass)
                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => setFret(string, pressed ? null : position)}
                    aria-pressed={pressed}
                    aria-label={`Cuerda ${STRING_NAMES[string]}, traste ${position}, ${noteName(pitchClass)}`}
                    className="relative flex h-12 items-center justify-center border-r-2 border-[#c8bba4] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-surface-violet-soft"
                  >
                    <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#8a7f6e]" style={{ height: thickness }} />
                    {pressed ? (
                      <span
                        className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold shadow-card ${isRoot ? "bg-surface-violet-soft text-primary" : "bg-primary text-on-primary"} ${ghost && ghostFret === position ? "ring-[3px] ring-fn-tonic ring-offset-1" : ""}`}
                      >
                        {label(pitchClass)}
                      </span>
                    ) : ghosted ? (
                      <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-fn-tonic bg-canvas/90 text-[11px] font-bold text-fn-tonic">
                        {label(pitchClass)}
                      </span>
                    ) : mapped ? (
                      <span
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold ${isRoot ? "bg-surface-violet-soft/50 text-ink" : "bg-ink/10 text-ink-mute"}`}
                      >
                        {label(pitchClass)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )
        })}
        {/* Fret numbers and inlay markers */}
        <div />
        {FRETS.map(position => (
          <div key={position} className="flex h-7 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-mute">
            <span className="flex gap-1">
              {position === 12 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                </>
              ) : SINGLE_MARKERS.has(position) ? (
                <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
              ) : (
                <span className="h-1.5" />
              )}
            </span>
            {position}
          </div>
        ))}
      </div>
    </div>
  )
}

function NutMark({ state, ghost, root, label }: { state: "open" | "muted" | "fretted"; ghost: "open" | "muted" | null; root: boolean; label: string | null }) {
  if (ghost) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-fn-tonic text-xs font-bold text-fn-tonic">
        {ghost === "open" ? "○" : "×"}
      </span>
    )
  }
  if (state === "open") {
    return (
      <span
        className={`flex h-7 min-w-7 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold ${root ? "border-surface-violet-soft bg-surface-violet-soft/40" : "border-ink bg-canvas"}`}
      >
        {label}
      </span>
    )
  }
  if (state === "muted") return <span className="flex h-7 w-7 items-center justify-center text-base font-bold text-ink-faint">×</span>
  return <span className="h-7 w-7" />
}
