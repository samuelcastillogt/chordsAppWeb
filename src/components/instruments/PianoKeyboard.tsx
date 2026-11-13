"use client"

import { useEffect, useRef } from "react"

import { intervalLabel, noteName } from "@/lib/music/identify"
import { PIANO_HIGH, PIANO_LOW, isBlackKey, midiName } from "@/lib/music/piano"

type Props = {
  pressed: Set<number>
  onToggle: (midi: number) => void
  /** A chord previewed over the current one: dashed keys where the hands would go. */
  ghost?: number[] | null
  rootPc: number | null
  chordType?: string
  labels: "notes" | "intervals"
}

const WHITE_WIDTH = 44
const BLACK_WIDTH = 28
const KEYS = Array.from({ length: PIANO_HIGH - PIANO_LOW + 1 }, (_, i) => PIANO_LOW + i)
const WHITE_KEYS = KEYS.filter(midi => !isBlackKey(midi))

/** Three-octave keyboard (C3–B5). Pressed keys show their note or interval; middle C is marked. */
export default function PianoKeyboard({ pressed, onToggle, ghost, rootPc, chordType, labels }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const ghostSet = new Set(ghost ?? [])
  const lowest = pressed.size ? Math.min(...Array.from(pressed)) : 60
  const highest = pressed.size ? Math.max(...Array.from(pressed)) : 67
  const label = (midi: number) => (labels === "intervals" && rootPc !== null ? intervalLabel(rootPc, midi % 12, chordType) : noteName(midi % 12))

  // On narrow screens bring the hand into view (again when the screen size or orientation changes).
  useEffect(() => {
    const bringIntoView = (behavior: ScrollBehavior) => {
      const element = scroller.current
      if (!element || element.scrollWidth <= element.clientWidth) return
      // Centre the chord: from the white key at (or below) its lowest note to the one at its highest.
      const first = WHITE_KEYS.filter(midi => midi <= lowest).length - 1
      const last = WHITE_KEYS.filter(midi => midi <= highest).length - 1
      const centre = ((first + last + 1) / 2) * WHITE_WIDTH
      element.scrollTo({ left: Math.max(0, centre - element.clientWidth / 2), behavior })
    }
    // Instant on first paint and on resize (a smooth scroll started while mounting gets dropped).
    bringIntoView(mounted.current ? "smooth" : "auto")
    mounted.current = true
    const onResize = () => bringIntoView("auto")
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [lowest, highest])

  function keyState(midi: number) {
    const isPressed = pressed.has(midi)
    const isGhost = ghostSet.has(midi)
    return { isPressed, isGhost, stays: isPressed && isGhost && ghost !== null && ghost !== undefined, isRoot: rootPc !== null && midi % 12 === rootPc }
  }

  return (
    <div ref={scroller} className="overflow-x-auto rounded-lg bg-canvas-soft p-3" role="group" aria-label="Teclado de piano, de C3 a B5">
      <div className="relative" style={{ width: WHITE_KEYS.length * WHITE_WIDTH, height: 220 }}>
        {WHITE_KEYS.map((midi, index) => {
          const { isPressed, isGhost, stays, isRoot } = keyState(midi)
          return (
            <button
              key={midi}
              type="button"
              onClick={() => onToggle(midi)}
              aria-pressed={isPressed}
              aria-label={`${midiName(midi)}${midi === 60 ? " (do central)" : ""}`}
              className={`absolute top-0 flex h-[220px] flex-col items-center justify-end gap-1.5 rounded-b-md border border-[#cfc5b3] pb-2 text-[11px] font-bold transition focus:outline-none focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-surface-violet-soft ${
                isPressed ? (isRoot ? "bg-surface-violet-soft text-primary" : "bg-primary text-on-primary") : "bg-canvas text-ink-faint hover:bg-white"
              } ${stays ? "ring-[3px] ring-inset ring-fn-tonic" : ""}`}
              style={{ left: index * WHITE_WIDTH, width: WHITE_WIDTH }}
            >
              {isGhost && !isPressed ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-fn-tonic text-fn-tonic">
                  {label(midi)}
                </span>
              ) : isPressed ? (
                <span>{label(midi)}</span>
              ) : null}
              {midi % 12 === 0 ? <span className={`text-[10px] ${isPressed ? "opacity-80" : ""}`}>{midiName(midi)}</span> : null}
            </button>
          )
        })}
        {KEYS.filter(isBlackKey).map(midi => {
          const { isPressed, isGhost, stays, isRoot } = keyState(midi)
          const whiteBefore = WHITE_KEYS.filter(white => white < midi).length
          return (
            <button
              key={midi}
              type="button"
              onClick={() => onToggle(midi)}
              aria-pressed={isPressed}
              aria-label={midiName(midi)}
              className={`absolute top-0 z-20 flex h-[136px] items-end justify-center rounded-b-md pb-2 text-[10px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-violet-soft ${
                isPressed
                  ? isRoot
                    ? "bg-surface-violet-soft text-primary"
                    : "bg-surface-teal-mid text-on-primary"
                  : "bg-ink text-transparent hover:bg-[#3a342c]"
              } ${stays ? "ring-[3px] ring-fn-tonic" : ""}`}
              style={{ left: whiteBefore * WHITE_WIDTH - BLACK_WIDTH / 2, width: BLACK_WIDTH }}
            >
              {isGhost && !isPressed ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-fn-tonic bg-canvas text-fn-tonic">
                  {label(midi)}
                </span>
              ) : isPressed ? (
                label(midi)
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
