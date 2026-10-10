import { CHROMATIC_NOTES, NOTE_OFFSETS } from "@/lib/music/theory"

export type Mode = "major" | "minor"
export type HarmonicFn = "T" | "SD" | "D"

/** Spanish note names for headings ("Sol mayor"). */
export const LATIN: Record<string, string> = {
  C: "Do",
  "C#": "Re♭",
  D: "Re",
  "D#": "Mi♭",
  E: "Mi",
  F: "Fa",
  "F#": "Fa#",
  G: "Sol",
  "G#": "La♭",
  A: "La",
  "A#": "Si♭",
  B: "Si",
}

/** Majors around the circle of fifths, starting at C and moving clockwise (one more sharp each step). */
export const CIRCLE_MAJORS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"]

/** Key signatures as musicians count them: flats on the left side of the circle. */
export const KEY_SIGNATURE: Record<string, string> = {
  C: "sin alteraciones",
  G: "1 sostenido",
  D: "2 sostenidos",
  A: "3 sostenidos",
  E: "4 sostenidos",
  B: "5 sostenidos",
  "F#": "6 sostenidos (o 6 bemoles)",
  "C#": "5 bemoles",
  "G#": "4 bemoles",
  "D#": "3 bemoles",
  "A#": "2 bemoles",
  F: "1 bemol",
}

/** How musicians write the flat-side keys: B♭ rather than A#, E♭ rather than D#… */
const FLAT_NAMES: Record<string, string> = { "A#": "B♭", "D#": "E♭", "G#": "A♭", "C#": "D♭" }

/** Display name of a chord or key id ("A#m" -> "B♭m"); ids stay in sharps for the API. */
export function displayName(id: string): string {
  const root = id.length > 1 && id[1] === "#" ? id.slice(0, 2) : id.slice(0, 1)
  return (FLAT_NAMES[root] ?? root) + id.slice(root.length)
}

export function transposeNote(note: string, semitones: number): string {
  return CHROMATIC_NOTES[((((NOTE_OFFSETS[note] ?? 0) + semitones) % 12) + 12) % 12]
}

/** The relative minor of a major key (A minor for C major). */
export function relativeMinor(major: string): string {
  return transposeNote(major, 9)
}

export type DiatonicChord = { degree: string; chord: string; notes: string[]; fn: HarmonicFn }

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10]
const MAJOR_QUALITIES = ["", "m", "m", "", "", "m", "dim"]
const MINOR_QUALITIES = ["m", "dim", "", "m", "m", "", ""]
const MAJOR_DEGREES = ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
const MINOR_DEGREES = ["i", "ii°", "III", "iv", "v", "VI", "VII"]
const MAJOR_FN: HarmonicFn[] = ["T", "SD", "T", "SD", "D", "T", "D"]
const MINOR_FN: HarmonicFn[] = ["T", "SD", "T", "SD", "D", "SD", "D"]
const TRIAD: Record<string, number[]> = { "": [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6] }

export function triadNotes(root: string, quality: string): string[] {
  return (TRIAD[quality] ?? TRIAD[""]).map(step => transposeNote(root, step))
}

/** The seven chords built on each degree of a key, with their usual harmonic function. */
export function diatonicChords(tonic: string, mode: Mode): DiatonicChord[] {
  const steps = mode === "major" ? MAJOR_STEPS : MINOR_STEPS
  const qualities = mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES
  return steps.map((step, index) => {
    const root = transposeNote(tonic, step)
    const quality = qualities[index]
    return {
      degree: (mode === "major" ? MAJOR_DEGREES : MINOR_DEGREES)[index],
      chord: root + quality,
      notes: triadNotes(root, quality),
      fn: (mode === "major" ? MAJOR_FN : MINOR_FN)[index],
    }
  })
}

/** "Sol mayor (G)", "Mi menor (Em)". */
export function keyName(tonic: string, mode: Mode): string {
  return `${LATIN[tonic]} ${mode === "major" ? "mayor" : "menor"} (${displayName(tonic + (mode === "minor" ? "m" : ""))})`
}
