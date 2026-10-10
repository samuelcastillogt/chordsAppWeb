import { describe, expect, it } from "vitest"

import { diatonicChords, relativeMinor, triadNotes } from "./keys"

describe("keys", () => {
  it("builds the diatonic chords of a major key", () => {
    expect(diatonicChords("G", "major").map(c => c.chord)).toEqual(["G", "Am", "Bm", "C", "D", "Em", "F#dim"])
  })

  it("builds the natural minor key", () => {
    expect(diatonicChords("A", "minor").map(c => c.chord)).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"])
  })

  it("finds relative minors and triads", () => {
    expect(relativeMinor("C")).toBe("A")
    expect(relativeMinor("E")).toBe("C#")
    expect(triadNotes("D", "")).toEqual(["D", "F#", "A"])
    expect(triadNotes("B", "dim")).toEqual(["B", "D", "F"])
  })
})
