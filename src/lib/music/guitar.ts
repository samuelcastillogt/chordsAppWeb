import { ChordMatch, chordPitchClasses, identifyMidis } from "@/lib/music/identify"
import { NOTE_OFFSETS } from "@/lib/music/theory"
import { Chord } from "@/types"

export { intervalLabel, noteName } from "@/lib/music/identify"
export type { ChordMatch as ShapeMatch } from "@/lib/music/identify"

/**
 * Guitar shapes: one fret per string, low E first (`[null, 3, 2, 0, 1, 0]` is C, written "x32010").
 * `null` is a muted string and 0 an open one.
 */
export type Shape = (number | null)[]

/** Standard tuning as MIDI numbers, low to high: E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"]
export const MAX_FRET = 15

export const EMPTY_SHAPE: Shape = [null, null, null, null, null, null]

const pc = (midi: number) => ((midi % 12) + 12) % 12

/** MIDI notes that sound, low to high. */
export function shapeMidis(shape: Shape, tuning = STANDARD_TUNING): number[] {
  return shape.flatMap((fret, string) => (fret === null ? [] : [tuning[string] + fret]))
}

/** Tab-style notation: "x32010", or dash-separated when a fret has two digits ("x-10-12-12-11-10"). */
export function formatShape(shape: Shape): string {
  const parts = shape.map(fret => (fret === null ? "x" : String(fret)))
  return parts.some(part => part.length > 1) ? parts.join("-") : parts.join("")
}

/** Parses "x32010", "x-10-12-12-11-10" or "x 3 2 0 1 0"; null when it isn't six valid strings. */
export function parseShape(text: string): Shape | null {
  const clean = text.trim().toLowerCase()
  const parts = /[\s,-]/.test(clean) ? clean.split(/[\s,-]+/).filter(Boolean) : clean.split("")
  if (parts.length !== 6) return null
  const shape = parts.map(part => (part === "x" ? null : /^\d{1,2}$/.test(part) ? Number(part) : NaN))
  return shape.some(fret => fret !== null && (Number.isNaN(fret) || fret > MAX_FRET)) ? null : shape
}

/** Names the chord a shape plays (see `identifyMidis`). */
export function identifyShape(shape: Shape, chords: Chord[], tuning = STANDARD_TUNING): ChordMatch[] {
  return identifyMidis(shapeMidis(shape, tuning), chords)
}

/** Lowest fretted fret, or 0 for an all-open shape: where the hand is. */
export function shapePosition(shape: Shape): number {
  const fretted = shape.filter((fret): fret is number => fret !== null && fret > 0)
  return fretted.length ? Math.min(...fretted) : 0
}

/**
 * Fingers a shape needs. A barre on the lowest fret counts as one finger when no open string sits
 * under it, and so does a partial barre over neighbouring strings on the same fret (the A-shape 5-5-5).
 */
export function fingersNeeded(shape: Shape): number {
  const fretted = shape.flatMap((fret, string) => (fret !== null && fret > 0 ? [{ fret, string }] : []))
  if (!fretted.length) return 0
  const lowest = Math.min(...fretted.map(item => item.fret))
  const onLowest = fretted.filter(item => item.fret === lowest)
  const firstBarreString = Math.min(...onLowest.map(item => item.string))
  const barre = onLowest.length >= 2 && !shape.some((fret, string) => fret === 0 && string > firstBarreString)

  let fingers = barre ? 1 : 0
  let previous: { fret: number; string: number } | null = null
  for (const item of fretted) {
    if (barre && item.fret === lowest) continue
    const sameRun = previous !== null && previous.fret === item.fret && previous.string === item.string - 1
    if (!sameRun) fingers += 1
    previous = item
  }
  return fingers
}

export type Voicing = { shape: Shape; position: number; fingers: number; strings: number }

/**
 * Playable voicings of a chord across the neck, root in the bass: contiguous strings (at least four,
 * or two for power chords), all chord tones (the fifth may be left out of 4+ note chords), a stretch
 * of four frets and no more than four fingers. One best voicing per hand position, low to high.
 */
export function chordVoicings(chord: Chord, tuning = STANDARD_TUNING, maxFret = MAX_FRET): Voicing[] {
  const tones = chordPitchClasses(chord)
  const rootPc = NOTE_OFFSETS[chord.root]
  const fifthPc = (rootPc + 7) % 12
  const minStrings = tones.size <= 2 ? 2 : 4
  const best = new Map<number, { voicing: Voicing; score: number }>()

  for (let start = 0; start <= maxFret - 3; start++) {
    const options = tuning.map(open => {
      const frets = [0, ...Array.from({ length: 4 }, (_, i) => Math.max(1, start) + i)].filter((fret, i, all) => all.indexOf(fret) === i && fret <= maxFret)
      return [null, ...frets.filter(fret => tones.has(pc(open + fret)))]
    })

    const walk = (string: number, shape: Shape) => {
      if (string === tuning.length) {
        consider(shape)
        return
      }
      for (const fret of options[string]) walk(string + 1, [...shape, fret])
    }

    const consider = (shape: Shape) => {
      const played = shape.flatMap((fret, string) => (fret === null ? [] : [string]))
      if (played.length < minStrings) return
      if (played[played.length - 1] - played[0] + 1 !== played.length) return // muted strings only at the edges
      const midis = shapeMidis(shape, tuning)
      if (pc(midis[0]) !== rootPc) return
      const sounding = new Set(midis.map(pc))
      const missing = Array.from(tones).filter(note => !sounding.has(note))
      if (missing.length > 1 || (missing.length === 1 && (missing[0] !== fifthPc || tones.size < 4))) return
      const fretted = shape.filter((fret): fret is number => fret !== null && fret > 0)
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return
      const fingers = fingersNeeded(shape)
      if (fingers > 4) return
      const position = shapePosition(shape)
      const opens = shape.filter(fret => fret === 0).length
      // Open strings belong to open position: a small bonus there, a penalty on frets 3-4 and
      // not used from fret 5 up, where they make shapes that are hard to read and to finger.
      if (opens && position > 4) return
      // A wide stretch costs more than the extra string it buys (xx0232 beats x50232 for D).
      const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
      // Open-position chords (C, G, D, Am…) never go past fret 3.
      const openPosition = position <= 2 && (!fretted.length || Math.max(...fretted) <= 3)
      const openScore = openPosition ? opens * 0.5 : -opens
      const score = played.length * 2 - fingers + openScore - span * 0.75 - missing.length * 2 + (sounding.size === tones.size ? 1 : 0)
      const current = best.get(position)
      if (!current || score > current.score) best.set(position, { voicing: { shape, position, fingers, strings: played.length }, score })
    }

    walk(0, [])
  }

  // Keep voicings at least two frets apart so each one is a different place on the neck.
  const kept: Array<{ voicing: Voicing; score: number }> = []
  for (const item of Array.from(best.values()).sort((a, b) => a.voicing.position - b.voicing.position)) {
    const last = kept[kept.length - 1]
    if (last && item.voicing.position - last.voicing.position < 2) {
      if (item.score > last.score) kept[kept.length - 1] = item
    } else kept.push(item)
  }
  return kept.map(item => item.voicing)
}

export type Move = {
  /** Strings whose finger stays on the same fret (notes that carry over). */
  stay: number
  /** Strings that change fret or start/stop sounding. */
  moved: number
  /** How far the hand slides along the neck, in frets. */
  slide: number
}

export function compareShapes(from: Shape, to: Shape): Move {
  let stay = 0
  let moved = 0
  from.forEach((fret, string) => {
    const next = to[string]
    if (fret !== null && next !== null && fret === next) stay += 1
    else if (fret !== next) moved += 1
  })
  return { stay, moved, slide: Math.abs(shapePosition(from) - shapePosition(to)) }
}

/** The voicing reached with the least hand movement from `from`. */
export function nearestVoicing(from: Shape, voicings: Voicing[]): (Voicing & { move: Move }) | null {
  let bestVoicing: (Voicing & { move: Move }) | null = null
  let bestCost = Infinity
  for (const voicing of voicings) {
    const move = compareShapes(from, voicing.shape)
    const cost = move.slide * 2 + move.moved - move.stay * 0.5 + voicing.fingers * 0.25
    if (cost < bestCost) {
      bestCost = cost
      bestVoicing = { ...voicing, move }
    }
  }
  return bestVoicing
}
