import { describe, expect, it } from "vitest"

import { buildMandala, mandalaNodeId, parseKey } from "@/lib/music/mandala"
import { collapseSteps, harmonicProfile, moveName, nodeUsage, sectionLabels, songLoops, songSteps, songTransitions, spellChord } from "@/lib/music/songmap"

const C = parseKey("C")!
const NODES = new Map(buildMandala(C, ["dominant", "major", "minor", "diminished"]).map(node => [node.id, node]))
const degreeOf = (node: string) => NODES.get(node)?.degree ?? null
const TYPES: Record<string, string> = { m: "minor", "7": "dom7", maj7: "maj7", m7: "m7" }
const toNode = (chord: string) => {
  const match = /^([A-G]#?)(.*)$/.exec(chord)!
  return mandalaNodeId({ root: match[1], type: TYPES[match[2]] ?? "major" }) ?? chord
}

const SONG = [
  { name: "verso", chords: ["C", "G", "Am", "F", "C", "G", "Am", "F"] },
  { name: "coro", chords: ["F", "G", "Am7", "Am", "F", "G", "C", "C7"] },
  { name: "puente", chords: ["G#", "A#", "C"] },
  { name: "coro", chords: ["F", "G", "Am", "F", "G", "C"] },
]

describe("song graph", () => {
  const steps = songSteps(SONG, toNode)

  it("maps every chord to its node and section", () => {
    expect(steps).toHaveLength(25)
    expect(steps[10]).toEqual({ chord: "Am7", node: "Am", section: 1 })
  })

  it("collapses back-to-back repeats for playback", () => {
    expect(collapseSteps(songSteps([{ name: "", chords: ["C", "C", "G", "C"] }], toNode)).map(step => step.chord)).toEqual(["C", "G", "C"])
  })

  it("counts how much each chord sounds and where", () => {
    const usage = nodeUsage(steps)
    expect(usage.get("C")).toMatchObject({ count: 5, sections: [0, 1, 2, 3] })
    expect(usage.get("Am")).toMatchObject({ count: 5, chords: ["Am", "Am7"] })
    expect(usage.get("C7")).toMatchObject({ count: 1, sections: [1] })
  })

  it("counts the moves between different chords, most frequent first", () => {
    const transitions = songTransitions(steps)
    expect(transitions[0].count).toBe(4)
    expect(transitions.find(t => t.from === "F" && t.to === "G")).toMatchObject({ count: 4 })
    expect(transitions.find(t => t.from === "Am" && t.to === "Am")).toBeUndefined()
    expect(transitions.find(t => t.from === "C7" && t.to === "G#")).toMatchObject({ count: 1, sections: [2] })
  })

  it("profiles the song by harmonic function", () => {
    const profile = harmonicProfile(nodeUsage(steps), degreeOf)
    expect(profile.tonic + profile.subdominant + profile.dominant + profile.secondary + profile.borrowed + profile.outside).toBeCloseTo(1)
    expect(profile.borrowed).toBeCloseTo(2 / 25)
    expect(profile.secondary).toBeCloseTo(1 / 25)
  })
})

describe("named moves and loops", () => {
  it("names well-known moves", () => {
    expect(moveName(degreeOf("G7"), degreeOf("C"))).toBe("Cadencia auténtica")
    expect(moveName(degreeOf("F"), degreeOf("C"))).toBe("Cadencia plagal")
    expect(moveName(degreeOf("Fm"), degreeOf("C"))).toBe("Cadencia plagal menor")
    expect(moveName(degreeOf("G"), degreeOf("Am"))).toBe("Cadencia rota")
    expect(moveName(degreeOf("A#"), degreeOf("C"))).toBe("Cadencia mixolidia")
    expect(moveName(degreeOf("Dm"), degreeOf("G"))).toBe("ii–V")
    expect(moveName(degreeOf("A7"), degreeOf("Dm"))).toBe("Dominante secundaria que resuelve")
    expect(moveName(degreeOf("C"), degreeOf("F"))).toBeNull()
  })

  it("finds repeating loops and names famous ones in any rotation", () => {
    const loops = songLoops(songSteps([{ name: "", chords: ["Am", "F", "C", "G", "Am", "F", "C", "G", "Am"] }], toNode), degreeOf)
    // vi–IV–I–V is the pop progression started on vi; numerals keep the song's order.
    expect(loops[0]).toMatchObject({ name: "La progresión pop (I–V–vi–IV)", numerals: ["vi", "IV", "I", "V"] })
    expect(loops[0].count).toBeGreaterThanOrEqual(2)
  })

  it("recognises the epic cadence even when it sounds once", () => {
    const loops = songLoops(songSteps([{ name: "", chords: ["C", "F", "G#", "A#", "C"] }], toNode), degreeOf)
    expect(loops.map(loop => loop.name)).toContain("Cadencia épica (♭VI–♭VII–I)")
  })
})

describe("labels", () => {
  it("numbers repeated sections and names the untitled start", () => {
    expect(
      sectionLabels([
        { name: "", chords: [] },
        { name: "coro", chords: [] },
        { name: "pre-coro", chords: [] },
        { name: "coro", chords: [] },
      ]),
    ).toEqual(["Inicio", "Coro", "Pre coro", "Coro 2"])
  })

  it("spells chords for the key", () => {
    expect(spellChord("A#", parseKey("C"))).toBe("B♭")
    expect(spellChord("A#", parseKey("B"))).toBe("A#")
    expect(spellChord("G#m", parseKey("C#m"))).toBe("G#m")
    expect(spellChord("D#", parseKey("Cm"))).toBe("E♭")
  })
})
