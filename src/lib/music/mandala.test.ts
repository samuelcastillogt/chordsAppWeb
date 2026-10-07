import { describe, expect, it } from "vitest"

import { buildMandala, circleIndex, curvePath, degreeInKey, mandalaNodeId, parallelSpoke, parseKey, spokeAngle, spokeOf } from "@/lib/music/mandala"
import { NOTE_OFFSETS } from "@/lib/music/theory"

const C = parseKey("C")!
const AM = parseKey("Am")!
const pc = (note: string) => NOTE_OFFSETS[note]

describe("mandala theory", () => {
  it("parses keys", () => {
    expect(C).toMatchObject({ tonic: 0, mode: "major", label: "C mayor" })
    expect(parseKey("F#m")).toMatchObject({ tonic: 6, mode: "minor" })
    expect(parseKey("H")).toBeNull()
  })

  it("maps catalog chords and extensions onto family nodes", () => {
    expect(mandalaNodeId({ root: "C", type: "maj7" })).toBe("C")
    expect(mandalaNodeId({ root: "A", type: "m7" })).toBe("Am")
    expect(mandalaNodeId({ root: "B", type: "m7b5" })).toBe("B°")
    expect(mandalaNodeId({ root: "G", type: "9" })).toBe("G7")
    expect(mandalaNodeId({ root: "C", type: "unknown" })).toBeNull()
  })

  it("names degrees, functions and roles in a major key", () => {
    expect(degreeInKey(pc("G"), "major", C)).toEqual({ numeral: "V", function: "D", role: "diatonic" })
    expect(degreeInKey(pc("A"), "minor", C)).toEqual({ numeral: "vi", function: "T", role: "diatonic" })
    expect(degreeInKey(pc("B"), "diminished", C)?.numeral).toBe("vii°")
    expect(degreeInKey(pc("F"), "minor", C)).toEqual({ numeral: "iv", function: "SD", role: "borrowed" })
    expect(degreeInKey(pc("A#"), "major", C)?.numeral).toBe("♭VII")
    expect(degreeInKey(pc("D"), "major", C)).toEqual({ numeral: "V/V", function: "D", role: "secondary_dominant" })
    expect(degreeInKey(pc("A"), "dominant", C)?.numeral).toBe("V7/ii")
    expect(degreeInKey(pc("F#"), "major", C)).toBeNull()
  })

  it("names degrees in a minor key", () => {
    expect(degreeInKey(pc("E"), "dominant", AM)?.numeral).toBe("V7")
    expect(degreeInKey(pc("C"), "major", AM)).toMatchObject({ numeral: "III", function: "T" })
    expect(degreeInKey(pc("G"), "major", AM)?.numeral).toBe("VII")
    expect(degreeInKey(pc("D"), "major", AM)).toMatchObject({ numeral: "IV", role: "borrowed" })
  })
})

describe("mandala geometry", () => {
  it("orders roots by fifths", () => {
    expect(["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"].map(note => circleIndex(pc(note)))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it("stacks a whole key on three neighbouring spokes", () => {
    // Relative minor, leading-tone diminished and the dominant 7th that resolves to C share C's spoke.
    expect(spokeOf(pc("A"), "minor")).toBe(spokeOf(pc("C"), "major"))
    expect(spokeOf(pc("B"), "diminished")).toBe(spokeOf(pc("C"), "major"))
    expect(spokeOf(pc("G"), "dominant")).toBe(spokeOf(pc("C"), "major"))
    expect(spokeOf(pc("D"), "minor")).toBe(spokeOf(pc("F"), "major"))
    expect(spokeOf(pc("E"), "minor")).toBe(spokeOf(pc("G"), "major"))
  })

  it("rotates so the tonic is on top and puts the parallel key three spokes away", () => {
    expect(spokeAngle(spokeOf(pc("C"), "major"), C)).toBeCloseTo(-Math.PI / 2)
    expect(spokeAngle(spokeOf(pc("A"), "minor"), AM)).toBeCloseTo(-Math.PI / 2)
    expect(spokeAngle(spokeOf(pc("G"), "major"), C)).toBeCloseTo(-Math.PI / 3)
    expect(parallelSpoke(C)).toBe(spokeOf(pc("C"), "minor"))
    expect(parallelSpoke(AM)).toBe(spokeOf(pc("A"), "major"))
  })

  it("builds twelve nodes per visible family", () => {
    const nodes = buildMandala(C, ["major", "minor"])
    expect(nodes).toHaveLength(24)
    const top = nodes.find(node => node.id === "C")!
    expect(top.x).toBeCloseTo(320)
    expect(top.y).toBeLessThan(320)
    expect(new Set(nodes.map(node => node.id)).size).toBe(24)
  })

  it("draws curves as quadratic paths", () => {
    expect(curvePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toBe("M0,0 Q50,0 100,0")
  })
})
