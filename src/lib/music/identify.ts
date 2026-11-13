import { CHROMATIC_NOTES, NOTE_OFFSETS } from "@/lib/music/theory"
import { Chord } from "@/types"

const pc = (midi: number) => ((midi % 12) + 12) % 12

export function noteName(pitchClass: number): string {
  return CHROMATIC_NOTES[((pitchClass % 12) + 12) % 12]
}

const INTERVAL_LABELS = ["R", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"]

/** Short interval label of a note against a chord root (R, ♭3, 5, ♭7…), spelled for the chord type. */
export function intervalLabel(rootPc: number, notePc: number, chordType?: string): string {
  const semitones = (((notePc - rootPc) % 12) + 12) % 12
  if (semitones === 8 && chordType === "aug") return "♯5"
  if (semitones === 2 && (chordType === "9" || chordType === "add9")) return "9"
  if (semitones === 9 && chordType === "dim7") return "♭♭7"
  return INTERVAL_LABELS[semitones]
}

export function chordPitchClasses(chord: Chord): Set<number> {
  return new Set((chord.notes ?? chord.triad).map(note => NOTE_OFFSETS[note]).filter(value => value !== undefined))
}

// Simple, common chords win ties (C before C/E-less exotic spellings of the same notes).
const TYPE_PRIORITY: Record<string, number> = {
  major: 0,
  minor: 0,
  dom7: 1,
  maj7: 1,
  m7: 1,
  "5": 1,
  dim: 2,
  aug: 2,
  sus2: 2,
  sus4: 2,
  m7b5: 2,
  dim7: 2,
  "6": 3,
  m6: 3,
  add9: 3,
  "9": 3,
}

export type ChordMatch = {
  chord: Chord
  /** "C", or "C/E" when the bass isn't the root. */
  name: string
  bass: string
  inversion: boolean
  /** Which chord tone is in the bass: 0 root position, 1 first inversion, 2 second, 3 third. */
  inversionNumber: number
  /** True when every chord tone sounds; false when only the fifth is left out. */
  complete: boolean
}

/**
 * Names the chord that a set of sounding notes (MIDI numbers) forms: complete chords before ones
 * missing the fifth, then root in the bass, then simpler chord types. The lowest note is the bass.
 */
export function identifyMidis(midis: number[], chords: Chord[]): ChordMatch[] {
  const played = new Set(midis.map(pc))
  if (played.size < 2) return []
  const bassPc = pc(Math.min(...midis))

  return chords
    .flatMap(chord => {
      const tones = chordPitchClasses(chord)
      const rootPc = NOTE_OFFSETS[chord.root]
      if (Array.from(played).some(note => !tones.has(note))) return []
      const missing = Array.from(tones).filter(note => !played.has(note))
      const complete = missing.length === 0
      if (!complete && !(missing.length === 1 && missing[0] === (rootPc + 7) % 12)) return []
      const order = (chord.notes ?? chord.triad).map(note => NOTE_OFFSETS[note])
      const inversionNumber = Math.max(0, order.indexOf(bassPc))
      const inversion = bassPc !== rootPc
      return [{ chord, name: inversion ? `${chord.id}/${noteName(bassPc)}` : chord.id, bass: noteName(bassPc), inversion, inversionNumber, complete }]
    })
    .sort(
      (a, b) =>
        Number(b.complete) - Number(a.complete) ||
        Number(a.inversion) - Number(b.inversion) ||
        (TYPE_PRIORITY[a.chord.type] ?? 4) - (TYPE_PRIORITY[b.chord.type] ?? 4) ||
        a.chord.id.localeCompare(b.chord.id),
    )
}
