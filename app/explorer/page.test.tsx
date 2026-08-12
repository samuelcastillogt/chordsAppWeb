import { describe, expect, it } from "vitest"

import { categoryColor, chordFamilyColor, connectionLabel, getChordRing, getCircleDistance, getChordRoot, getIntervalName, noteToFrequency } from "@/lib/music"

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
})
