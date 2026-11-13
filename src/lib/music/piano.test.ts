import { describe, expect, it } from "vitest"

import { identifyMidis } from "@/lib/music/identify"
import { chordInversions, describeMoves, isBlackKey, midiName, parseMidiName, smoothestVoicing, voiceMoves } from "@/lib/music/piano"
import { Chord } from "@/types"

const chord = (id: string, root: string, type: string, notes: string[]): Chord => ({ id, root, type, notes, triad: notes.slice(0, 3), circlePosition: 0 })

const C = chord("C", "C", "major", ["C", "E", "G"])
const F = chord("F", "F", "major", ["F", "A", "C"])
const G7 = chord("G7", "G", "dom7", ["G", "B", "D", "F"])
const AM = chord("Am", "A", "minor", ["A", "C", "E"])
const CATALOG = [C, F, G7, AM, chord("C6", "C", "6", ["C", "E", "G", "A"]), chord("Am7", "A", "m7", ["A", "C", "E", "G"])]

describe("keyboard", () => {
  it("names keys with their octave", () => {
    expect(midiName(60)).toBe("C4")
    expect(midiName(61)).toBe("C#4")
    expect(isBlackKey(61)).toBe(true)
    expect(isBlackKey(64)).toBe(false)
    expect(parseMidiName("C4")).toBe(60)
    expect(parseMidiName("F#3")).toBe(54)
    expect(parseMidiName("C9")).toBeNull()
    expect(parseMidiName("H4")).toBeNull()
  })
})

describe("piano chord identification", () => {
  it("uses the lowest key as the bass, not the note name", () => {
    expect(identifyMidis([60, 64, 67], CATALOG)[0]).toMatchObject({ name: "C", inversionNumber: 0 })
    expect(identifyMidis([52, 60, 67], CATALOG)[0]).toMatchObject({ name: "C/E", inversionNumber: 1 })
    expect(identifyMidis([55, 64, 72], CATALOG)[0]).toMatchObject({ name: "C/G", inversionNumber: 2 })
    expect(identifyMidis([53, 59, 62, 67], CATALOG)[0]).toMatchObject({ name: "G7/F", inversionNumber: 3 })
  })
})

describe("inversions", () => {
  it("stacks every inversion in close position near the requested bass", () => {
    // Second inversion: G3 is closer to C4 than G4 is.
    expect(chordInversions(C, 60).map(voicing => voicing.midis)).toEqual([
      [60, 64, 67],
      [64, 67, 72],
      [55, 60, 64],
    ])
    expect(chordInversions(G7, 55)).toHaveLength(4)
  })
})

describe("voice leading", () => {
  it("pairs voices by position", () => {
    expect(voiceMoves([60, 64, 67], [60, 65, 69])).toEqual([
      { from: 60, to: 60 },
      { from: 64, to: 65 },
      { from: 67, to: 69 },
    ])
  })

  it("moves C to F with the common tone held (C E G → C F A)", () => {
    const next = smoothestVoicing([60, 64, 67], F)!
    expect(next.midis).toEqual([60, 65, 69])
    expect(next.semitones).toBe(3)
  })

  it("finds the textbook G7 → C resolution in close position", () => {
    // B D F G (first inversion G7) resolves to C E G C with small steps
    const next = smoothestVoicing([59, 62, 65, 67], C)!
    expect(next.semitones).toBeLessThanOrEqual(6)
    expect(next.midis.every(note => note >= 55 && note <= 72)).toBe(true)
  })

  it("describes what each voice does", () => {
    expect(describeMoves(voiceMoves([60, 64, 67], [60, 65, 69]))).toEqual({ stay: ["C"], moved: ["E → F (sube 1)", "G → A (sube 2)"], added: [], released: [] })
  })

  it("holds common tones and adds the new note when the chord grows (C → C7)", () => {
    expect(describeMoves(voiceMoves([60, 64, 67], [60, 64, 67, 70]))).toEqual({ stay: ["C", "E", "G"], moved: [], added: ["A#"], released: [] })
  })

  it("releases a note when the chord shrinks (G7 → C)", () => {
    const { released, added } = describeMoves(voiceMoves([55, 59, 62, 65], [55, 60, 64]))
    expect(added).toEqual([])
    expect(released).toHaveLength(1)
  })

  it("needs a starting chord", () => {
    expect(smoothestVoicing([], C)).toBeNull()
  })
})
