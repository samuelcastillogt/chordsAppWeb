const NOTE_OFFSETS: Record<string, number> = {
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

export function getChordRoot(chordId: string): string {
  return chordId.includes("#") ? chordId.slice(0, 2) : chordId.slice(0, 1)
}

export function getIntervalName(baseNote: string, targetNote: string): string {
  const baseOffset = NOTE_OFFSETS[baseNote]
  const targetOffset = NOTE_OFFSETS[targetNote]
  if (baseOffset === undefined || targetOffset === undefined) return "intervalo desconocido"
  return INTERVAL_NAMES[(targetOffset - baseOffset + 12) % 12]
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
  if (type === "major") return "#f472b6"
  if (type === "minor") return "#38bdf8"
  if (type === "dim" || type === "dim7") return "#8b5cf6"
  if (type === "dom7") return "#facc15"
  if (type === "aug") return "#22c55e"
  return "#c9b4fa"
}

export function connectionLabel(category: string): string {
  if (category === "natural") return "Natural"
  if (category === "media") return "Media"
  if (category === "tensa") return "Tensa"
  return "Extrema"
}
