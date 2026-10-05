import { Chord } from "@/types"

export const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
}

export const CHROMATIC_NOTES = Object.keys(NOTE_OFFSETS)

export const CHORD_TYPE_RING: Record<string, number> = {
  major: 0,
  minor: 1,
  dom7: 2,
  dim: 3,
  aug: 4,
  dim7: 5,
}

const INTERVAL_NAMES = [
  "unisono",
  "segunda menor",
  "segunda mayor",
  "tercera menor",
  "tercera mayor",
  "cuarta justa",
  "tritono",
  "quinta justa",
  "sexta menor",
  "sexta mayor",
  "septima menor",
  "septima mayor",
]

export type FretboardPosition = {
  stringName: string
  fret: number
  note: string
  interval: string | null
  isChordTone: boolean
}

export type CompatibleChord = {
  chord: Chord
  matchedNotes: string[]
  coverage: number
}

const GUITAR_TUNING = ["E", "B", "G", "D", "A", "E"]

export function getChordRoot(chordId: string): string {
  return chordId.includes("#") ? chordId.slice(0, 2) : chordId.slice(0, 1)
}

export function getIntervalName(baseNote: string, targetNote: string): string {
  const baseOffset = NOTE_OFFSETS[baseNote]
  const targetOffset = NOTE_OFFSETS[targetNote]
  if (baseOffset === undefined || targetOffset === undefined) return "intervalo desconocido"
  return INTERVAL_NAMES[(targetOffset - baseOffset + 12) % 12]
}

export function buildGuitarFretboard(root: string, chordNotes: string[], maxFret = 12): FretboardPosition[][] {
  const chordToneSet = new Set(chordNotes)

  return GUITAR_TUNING.map(stringName => {
    const openOffset = NOTE_OFFSETS[stringName]
    return Array.from({ length: maxFret + 1 }, (_, fret) => {
      const note = Object.keys(NOTE_OFFSETS).find(candidate => NOTE_OFFSETS[candidate] === (openOffset + fret) % 12) ?? stringName
      const isChordTone = chordToneSet.has(note)

      return {
        stringName,
        fret,
        note,
        interval: isChordTone ? getIntervalName(root, note) : null,
        isChordTone,
      }
    })
  })
}

export function getUniqueNotes(notes: string[]): string[] {
  return Array.from(new Set(notes.filter(note => NOTE_OFFSETS[note] !== undefined)))
}

export function findCompatibleChords(chords: Chord[], pressedNotes: string[]): CompatibleChord[] {
  const notes = getUniqueNotes(pressedNotes)
  if (notes.length === 0) return []

  return chords
    .map(chord => {
      const tones = chord.notes ?? chord.triad
      const chordToneSet = new Set(tones)
      const matchedNotes = notes.filter(note => chordToneSet.has(note))

      return {
        chord,
        matchedNotes,
        coverage: matchedNotes.length / Math.max(tones.length, 1),
      }
    })
    .filter(match => match.matchedNotes.length === notes.length)
    .sort((a, b) => b.coverage - a.coverage || a.chord.id.localeCompare(b.chord.id))
}

export function getCircleAngle(circlePosition: number): number {
  return (2 * Math.PI * circlePosition) / 12 - Math.PI / 2
}

export function getCircleDistance(a: number, b: number): number {
  const distance = Math.abs(a - b)
  return Math.min(distance, 12 - distance)
}

export function getChordRing(type: string): number {
  return CHORD_TYPE_RING[type] ?? 6
}

export function noteToFrequency(note: string, octave = 4): number {
  const offset = NOTE_OFFSETS[note]
  if (offset === undefined) return 261.63
  const midi = 12 * (octave + 1) + offset
  return 440 * 2 ** ((midi - 69) / 12)
}

export function categoryColor(category: string): string {
  if (category === "natural") return "#22c55e"
  if (category === "media") return "#eab308"
  if (category === "tensa") return "#f97316"
  return "#ef4444"
}

export function chordFamilyColor(type: string): string {
  if (type === "major" || type === "maj7" || type === "add9" || type === "6") return "#f472b6"
  if (type === "minor" || type === "m7" || type === "m6") return "#38bdf8"
  if (type === "dim" || type === "dim7" || type === "m7b5") return "#8b5cf6"
  if (type === "dom7" || type === "9") return "#facc15"
  if (type === "aug") return "#22c55e"
  return "#c9b4fa"
}

/** Colour of a harmonic function (tónica, subdominante, dominante) or chord role. */
export function functionColor(fn: string | null, role?: string): string {
  if (role === "borrowed") return "#7b5cd6"
  if (role === "chromatic") return "#6b7280"
  if (fn === "T") return "#1f8a70"
  if (fn === "SD") return "#c98a14"
  if (fn === "D") return "#d4462b"
  return "#6b7280"
}

export function functionLabel(fn: string | null, role?: string): string {
  if (role === "secondary_dominant") return "Dominante secundaria"
  if (role === "borrowed") return "Prestado"
  if (role === "chromatic") return "Cromático"
  if (fn === "T") return "Tónica"
  if (fn === "SD") return "Subdominante"
  if (fn === "D") return "Dominante"
  return "Color"
}

/** Splits free text ("Bm G D A", "C - G | Am, F") into chord symbols. */
const CHORD_START_RE = /^([A-G]|DO|RE|MI|FA|SOL|LA|SI)/i

export function splitChordInput(value: string): string[] {
  return value
    .split(/[\s,|;]+/)
    .flatMap(token => {
      // "Bm-G-D-A" is a common songbook shorthand; "Bm7-5" is a single chord.
      const parts = token.split("-").filter(Boolean)
      return parts.length > 1 && parts.every(part => CHORD_START_RE.test(part)) ? parts : [token]
    })
    .map(token => token.trim().replace(/^[\[(]+|[\])]+$/g, ""))
    .filter(token => token && token !== "-")
}

export function connectionLabel(category: string): string {
  if (category === "natural") return "Natural"
  if (category === "media") return "Media"
  if (category === "tensa") return "Tensa"
  return "Extrema"
}
