import { describe, expect, it } from "vitest"

import {
  chordVoicings,
  compareShapes,
  fingersNeeded,
  formatShape,
  identifyShape,
  intervalLabel,
  nearestVoicing,
  parseShape,
  shapeMidis,
} from "@/lib/music/guitar"
import { Chord } from "@/types"

const chord = (id: string, root: string, type: string, notes: string[]): Chord => ({ id, root, type, notes, triad: notes.slice(0, 3), circlePosition: 0 })

const CATALOG: Chord[] = [
  chord("C", "C", "major", ["C", "E", "G"]),
  chord("C6", "C", "6", ["C", "E", "G", "A"]),
  chord("Cmaj7", "C", "maj7", ["C", "E", "G", "B"]),
  chord("Am", "A", "minor", ["A", "C", "E"]),
  chord("Am7", "A", "m7", ["A", "C", "E", "G"]),
  chord("G", "G", "major", ["G", "B", "D"]),
  chord("G7", "G", "dom7", ["G", "B", "D", "F"]),
  chord("F", "F", "major", ["F", "A", "C"]),
  chord("Bm", "B", "minor", ["B", "D", "F#"]),
  chord("E5", "E", "5", ["E", "B"]),
]

const byId = (id: string) => CATALOG.find(item => item.id === id)!

describe("shape notation", () => {
  it("parses and formats tab-style shapes", () => {
    expect(parseShape("x32010")).toEqual([null, 3, 2, 0, 1, 0])
    expect(parseShape("X-10-12-12-11-10")).toEqual([null, 10, 12, 12, 11, 10])
    expect(parseShape("x 3 2 0 1 0")).toEqual([null, 3, 2, 0, 1, 0])
    expect(parseShape("x3201")).toBeNull()
    expect(parseShape("x3201z")).toBeNull()
    expect(parseShape("x-3-2-0-1-20")).toBeNull()
    expect(formatShape([null, 3, 2, 0, 1, 0])).toBe("x32010")
    expect(formatShape([null, 10, 12, 12, 11, 10])).toBe("x-10-12-12-11-10")
  })

  it("turns a shape into the MIDI notes that sound", () => {
    expect(shapeMidis([null, 3, 2, 0, 1, 0])).toEqual([48, 52, 55, 60, 64])
  })

  it("labels intervals against the root, spelled for the chord", () => {
    expect(intervalLabel(0, 4)).toBe("3")
    expect(intervalLabel(9, 0)).toBe("♭3")
    expect(intervalLabel(7, 5)).toBe("♭7")
    expect(intervalLabel(0, 8, "aug")).toBe("♯5")
    expect(intervalLabel(0, 2, "add9")).toBe("9")
  })
})

describe("chord identification", () => {
  it("names common open chords", () => {
    expect(identifyShape(parseShape("x32010")!, CATALOG)[0].name).toBe("C")
    expect(identifyShape(parseShape("x02210")!, CATALOG)[0].name).toBe("Am")
    expect(identifyShape(parseShape("320001")!, CATALOG)[0].name).toBe("G7")
    expect(identifyShape(parseShape("x24432")!, CATALOG)[0].name).toBe("Bm")
    expect(identifyShape(parseShape("133211")!, CATALOG)[0].name).toBe("F")
  })

  it("names inversions by their bass", () => {
    const [match] = identifyShape(parseShape("032010")!, CATALOG)
    expect(match).toMatchObject({ name: "C/E", inversion: true, bass: "E" })
  })

  it("accepts a chord with the fifth left out", () => {
    // G7 without D: G F B
    const [match] = identifyShape(parseShape("3x34xx")!, CATALOG)
    expect(match).toMatchObject({ name: "G7", complete: false })
  })

  it("prefers the reading with the root in the bass", () => {
    // A C E G: Am7 (root A in the bass) before C6/A
    expect(
      identifyShape(parseShape("x02010")!, CATALOG)
        .map(item => item.name)
        .slice(0, 2),
    ).toEqual(["Am7", "C6/A"])
  })

  it("prefers a complete chord over one missing its fifth", () => {
    // C A E: Am/C, not C6 without G
    expect(identifyShape(parseShape("x3x2x0")!, CATALOG)[0].name).toBe("Am/C")
  })

  it("needs at least two different notes", () => {
    expect(identifyShape(parseShape("x3xxxx")!, CATALOG)).toEqual([])
  })
})

describe("voicings", () => {
  it("counts a playable barre as one finger", () => {
    expect(fingersNeeded(parseShape("x32010")!)).toBe(3)
    // Barre on 1 plus the two notes on fret 3 (one finger each run) and fret 2.
    expect(fingersNeeded(parseShape("133211")!)).toBe(3)
    // Barre on 3 plus a partial barre on 5.
    expect(fingersNeeded(parseShape("x35553")!)).toBe(2)
    // An open string under the lowest fret rules the barre out.
    expect(fingersNeeded(parseShape("x02210")!)).toBe(2)
  })

  it("finds the classic C shapes along the neck", () => {
    const shapes = chordVoicings(byId("C")).map(voicing => formatShape(voicing.shape))
    expect(shapes).toContain("x32010")
    expect(shapes).toContain("x35553")
    expect(shapes).toContain("8-10-10-9-8-8")
  })

  it("prefers the textbook open shapes over stretched ones", () => {
    expect(chordVoicings(byId("Am")).map(voicing => formatShape(voicing.shape))[0]).toBe("x02210")
    expect(chordVoicings(byId("Bm")).map(voicing => formatShape(voicing.shape))).toContain("x24432")
  })

  it("only returns playable voicings with the root in the bass", () => {
    for (const voicing of chordVoicings(byId("G7"))) {
      expect(voicing.fingers).toBeLessThanOrEqual(4)
      expect(shapeMidis(voicing.shape)[0] % 12).toBe(7)
    }
  })

  it("builds power chords on two or three strings", () => {
    expect(chordVoicings(byId("E5")).length).toBeGreaterThan(0)
  })

  it("measures how much the hand moves between shapes", () => {
    // C → Am: D2, B1 and the open high E stay; the A string and the G string change.
    expect(compareShapes(parseShape("x32010")!, parseShape("x02210")!)).toEqual({ stay: 3, moved: 2, slide: 0 })
  })

  it("picks the next voicing closest to the hand", () => {
    const fromBarreC = parseShape("8-10-10-9-8-8")!
    const next = nearestVoicing(fromBarreC, chordVoicings(byId("F")))
    expect(next!.position).toBeGreaterThanOrEqual(5)
    const fromOpenC = nearestVoicing(parseShape("x32010")!, chordVoicings(byId("F")))
    expect(fromOpenC!.position).toBeLessThanOrEqual(3)
  })
})
