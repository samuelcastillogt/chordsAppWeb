import { describe, expect, it } from "vitest"

import { buildGuitarFretboard, categoryColor, chordFamilyColor, connectionLabel, findCompatibleChords, functionColor, functionLabel, getChordRing, getCircleDistance, getChordRoot, getIntervalName, noteToFrequency, splitChordInput } from "@/lib/music"
import { Chord } from "@/types"

describe("music helpers", () => {
  it("maps notes to stable frequencies", () => {
    expect(Math.round(noteToFrequency("A", 4))).toBe(440)
    expect(Math.round(noteToFrequency("C", 4))).toBe(262)
  })

  it("maps connection categories to labels and colors", () => {
    expect(connectionLabel("natural")).toBe("Natural")
    expect(connectionLabel("media")).toBe("Media")
    expect(categoryColor("tensa")).toBe("#f97316")
    expect(categoryColor("extrema")).toBe("#ef4444")
  })

  it("maps chord families to mandala colors", () => {
    expect(chordFamilyColor("major")).toBe("#f472b6")
    expect(chordFamilyColor("minor")).toBe("#38bdf8")
    expect(chordFamilyColor("dim7")).toBe("#8b5cf6")
    expect(chordFamilyColor("dom7")).toBe("#facc15")
    expect(chordFamilyColor("aug")).toBe("#22c55e")
  })

  it("extracts chord roots and names intervals from the base note", () => {
    expect(getChordRoot("C#m")).toBe("C#")
    expect(getChordRoot("G7")).toBe("G")
    expect(getIntervalName("C", "G")).toBe("quinta justa")
    expect(getIntervalName("C", "F#")).toBe("tritono")
  })

  it("calculates fifth-circle distances and chord family rings", () => {
    expect(getCircleDistance(0, 1)).toBe(1)
    expect(getCircleDistance(0, 11)).toBe(1)
    expect(getCircleDistance(0, 6)).toBe(6)
    expect(getChordRing("major")).toBe(0)
    expect(getChordRing("minor")).toBe(1)
    expect(getChordRing("dim7")).toBe(5)
  })

  it("builds guitar fretboard positions for chord intervals", () => {
    const fretboard = buildGuitarFretboard("C", ["C", "E", "G"], 3)
    const highEString = fretboard[0]
    const gString = fretboard[2]

    expect(highEString[0]).toMatchObject({ note: "E", interval: "tercera mayor", isChordTone: true })
    expect(gString[0]).toMatchObject({ note: "G", interval: "quinta justa", isChordTone: true })
    expect(highEString[1]).toMatchObject({ note: "F", interval: null, isChordTone: false })
  })

  it("finds chords compatible with pressed notes", () => {
    const chords: Chord[] = [
      { id: "C", root: "C", type: "major", triad: ["C", "E", "G"], circlePosition: 0 },
      { id: "Am", root: "A", type: "minor", triad: ["A", "C", "E"], circlePosition: 3 },
      { id: "G", root: "G", type: "major", triad: ["G", "B", "D"], circlePosition: 1 },
    ]

    const matches = findCompatibleChords(chords, ["C", "E"])

    expect(matches.map(match => match.chord.id)).toEqual(["Am", "C"])
    expect(findCompatibleChords(chords, ["F#"])).toEqual([])
  })

  it("splits pasted chord text into symbols", () => {
    expect(splitChordInput("Bm G D A")).toEqual(["Bm", "G", "D", "A"])
    expect(splitChordInput("Bm-G-D-A (x2)")).toEqual(["Bm", "G", "D", "A", "x2"])
    expect(splitChordInput("C | Am, F;G7")).toEqual(["C", "Am", "F", "G7"])
    expect(splitChordInput("Bm7-5 E7")).toEqual(["Bm7-5", "E7"])
    expect(splitChordInput("DOadd9 SOL/SI")).toEqual(["DOadd9", "SOL/SI"])
  })

  it("colours and labels harmonic functions", () => {
    expect(functionColor("T", "diatonic")).toBe("#1f8a70")
    expect(functionColor("D", "secondary_dominant")).toBe("#d4462b")
    expect(functionColor("SD", "borrowed")).toBe("#7b5cd6")
    expect(functionLabel("D", "secondary_dominant")).toBe("Dominante secundaria")
    expect(functionLabel("SD", "diatonic")).toBe("Subdominante")
  })

  it("maps extended chord types to their family colour", () => {
    expect(chordFamilyColor("maj7")).toBe(chordFamilyColor("major"))
    expect(chordFamilyColor("m7")).toBe(chordFamilyColor("minor"))
    expect(chordFamilyColor("m7b5")).toBe(chordFamilyColor("dim"))
  })
})
