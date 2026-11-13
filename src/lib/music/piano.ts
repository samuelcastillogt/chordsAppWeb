import { noteName } from "@/lib/music/identify"
import { NOTE_OFFSETS } from "@/lib/music/theory"
import { Chord } from "@/types"

/** Visible keyboard: C3 to B5. */
export const PIANO_LOW = 48
export const PIANO_HIGH = 83

const pc = (midi: number) => ((midi % 12) + 12) % 12

export function midiName(midi: number): string {
  return `${noteName(pc(midi))}${Math.floor(midi / 12) - 1}`
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(pc(midi))
}

/** Computer keyboard as a piano, like a DAW: the home row is the white keys from C4. */
export const COMPUTER_KEYS: Record<string, number> = {
  a: 60,
  w: 61,
  s: 62,
  e: 63,
  d: 64,
  f: 65,
  t: 66,
  g: 67,
  y: 68,
  h: 69,
  u: 70,
  j: 71,
  k: 72,
  o: 73,
  l: 74,
  p: 75,
  ";": 76,
  ñ: 76,
}

export const INVERSION_NAMES = ["Estado fundamental", "1.ª inversión", "2.ª inversión", "3.ª inversión", "4.ª inversión"]

/** Chord tones in stacking order (root, third, fifth, seventh…), as pitch classes. */
function stackOrder(chord: Chord): number[] {
  return (chord.notes ?? chord.triad).map(note => NOTE_OFFSETS[note]).filter(value => value !== undefined)
}

/** Stacks pitch classes upward from `bass` in close position. */
function stack(order: number[], bass: number): number[] {
  const midis = [bass]
  for (const note of order.slice(1)) {
    let midi = midis[midis.length - 1] + 1
    while (pc(midi) !== note) midi += 1
    midis.push(midi)
  }
  return midis
}

export type PianoVoicing = { midis: number[]; inversion: number }

/** Close-position inversions of a chord, each with its bass as close as possible to `nearBass`. */
export function chordInversions(chord: Chord, nearBass = 60): PianoVoicing[] {
  const order = stackOrder(chord)
  return order.map((_, inversion) => {
    const rotated = [...order.slice(inversion), ...order.slice(0, inversion)]
    const candidates = [-24, -12, 0, 12, 24].map(shift => nearBass - pc(nearBass) + rotated[0] + shift)
    const fits = candidates.filter(bass => bass >= PIANO_LOW && stack(rotated, bass).at(-1)! <= PIANO_HIGH)
    const bass = (fits.length ? fits : candidates).reduce((best, item) => (Math.abs(item - nearBass) < Math.abs(best - nearBass) ? item : best))
    return { midis: stack(rotated, bass), inversion }
  })
}

/** Where a voice goes. `from: null` is a note added, `to: null` a note released. */
export type VoiceMove = { from: number | null; to: number | null }

/**
 * Pairs the voices of two chords. Same size: by position (bass to bass, top to top). Different
 * size: common tones hold, the rest pair up by proximity, and whatever is left is added or released.
 */
export function voiceMoves(from: number[], to: number[]): VoiceMove[] {
  const a = [...from].sort((x, y) => x - y)
  const b = [...to].sort((x, y) => x - y)
  if (a.length === b.length) return a.map((note, index) => ({ from: note, to: b[index] }))

  const moves: VoiceMove[] = []
  const restFrom = a.filter(note => !b.includes(note))
  const restTo = b.filter(note => !a.includes(note))
  a.filter(note => b.includes(note)).forEach(note => moves.push({ from: note, to: note }))
  while (restFrom.length && restTo.length) {
    let best = { i: 0, j: 0, distance: Infinity }
    restFrom.forEach((note, i) =>
      restTo.forEach((target, j) => {
        const distance = Math.abs(target - note)
        if (distance < best.distance) best = { i, j, distance }
      }),
    )
    moves.push({ from: restFrom.splice(best.i, 1)[0], to: restTo.splice(best.j, 1)[0] })
  }
  restTo.forEach(note => moves.push({ from: null, to: note }))
  restFrom.forEach(note => moves.push({ from: note, to: null }))
  return moves.sort((x, y) => (x.to ?? x.from!) - (y.to ?? y.from!))
}

/** Semitones the hand travels; adding or releasing a note counts as one. */
function movement(from: number[], to: number[]): number {
  return voiceMoves(from, to).reduce((sum, move) => sum + (move.from === null || move.to === null ? 1 : Math.abs(move.to - move.from)), 0)
}

export type VoiceLeading = PianoVoicing & { moves: VoiceMove[]; semitones: number }

/** The inversion and octave of `chord` reached with the fewest semitones of movement from `from`. */
export function smoothestVoicing(from: number[], chord: Chord): VoiceLeading | null {
  if (!from.length) return null
  const bass = Math.min(...from)
  const candidates = [-12, 0, 12].flatMap(shift => chordInversions(chord, bass + shift))
  let best: VoiceLeading | null = null
  for (const candidate of candidates) {
    if (candidate.midis[0] < PIANO_LOW || candidate.midis.at(-1)! > PIANO_HIGH) continue
    const semitones = movement(from, candidate.midis)
    if (!best || semitones < best.semitones) best = { ...candidate, moves: voiceMoves(from, candidate.midis), semitones }
  }
  return best
}

/** "E se queda · C → B (baja 1) · agrega A#": what each voice does, in plain words. */
export function describeMoves(moves: VoiceMove[]): { stay: string[]; moved: string[]; added: string[]; released: string[] } {
  const stay: string[] = []
  const moved: string[] = []
  const added: string[] = []
  const released: string[] = []
  for (const { from, to } of moves) {
    if (from === null) added.push(noteName(pc(to!)))
    else if (to === null) released.push(noteName(pc(from)))
    else if (to === from) stay.push(noteName(pc(to)))
    else moved.push(`${noteName(pc(from))} → ${noteName(pc(to))} (${to > from ? "sube" : "baja"} ${Math.abs(to - from)})`)
  }
  return { stay: Array.from(new Set(stay)), moved, added, released }
}

/** Parses "C4" or "F#3" into a MIDI number; null if it isn't a note on the keyboard. */
export function parseMidiName(text: string): number | null {
  const match = /^([A-G]#?)(-?\d)$/.exec(text.trim())
  if (!match || NOTE_OFFSETS[match[1]] === undefined) return null
  const midi = (Number(match[2]) + 1) * 12 + NOTE_OFFSETS[match[1]]
  return midi >= PIANO_LOW && midi <= PIANO_HIGH ? midi : null
}
