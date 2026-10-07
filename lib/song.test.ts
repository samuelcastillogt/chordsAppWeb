import { describe, expect, it } from "vitest"

import { collapseRepeats, condenseSong } from "@/lib/song"

describe("song condensing", () => {
  it("collapses back-to-back repeats of a run", () => {
    expect(collapseRepeats(["Am", "F", "C", "G", "Am", "F", "C", "G", "E7"])).toEqual(["Am", "F", "C", "G", "E7"])
    expect(collapseRepeats(["C", "C", "G"])).toEqual(["C", "G"])
    expect(collapseRepeats(["C", "G", "Am", "F"])).toEqual(["C", "G", "Am", "F"])
    expect(collapseRepeats(["A", "B", "A", "B", "A", "B"])).toEqual(["A", "B"])
  })

  it("skips sections that repeat earlier harmony and caps the length", () => {
    const sections = [
      { name: "intro", chords: ["Am", "F", "C", "G"] },
      { name: "verso", chords: ["Am", "F", "C", "G", "Am", "F", "C", "G"] },
      { name: "coro", chords: ["F", "G", "Am", "F", "G", "E7", "Am"] },
      { name: "verso", chords: ["Am", "F", "C", "G"] },
    ]
    expect(condenseSong(sections)).toEqual(["Am", "F", "C", "G", "F", "G", "Am", "F", "G", "E7", "Am"])
    expect(condenseSong(sections, 3)).toEqual(["Am", "F", "C"])
  })
})
