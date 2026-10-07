import { describe, expect, it } from "vitest"

import { pushStep, stepsByChord, trailContext, undoStep } from "@/lib/music/trail"

describe("mandala trail", () => {
  it("keeps every picked chord and ignores re-clicking the current one", () => {
    let trail: string[] = []
    trail = pushStep(trail, "C")
    trail = pushStep(trail, "G")
    trail = pushStep(trail, "G")
    trail = pushStep(trail, "Am")
    trail = pushStep(trail, "C")
    expect(trail).toEqual(["C", "G", "Am", "C"])
    expect(undoStep(trail)).toEqual(["C", "G", "Am"])
  })

  it("builds the context that ends on the current chord", () => {
    expect(trailContext(["C", "G", "Am"], "Am")).toEqual(["C", "G", "Am"])
    expect(trailContext(["C", "G"], "F")).toEqual(["C", "G", "F"])
    expect(trailContext([], "D")).toEqual(["D"])
    expect(trailContext(["A", "B", "C", "D", "E"], "E", 3)).toEqual(["C", "D", "E"])
  })

  it("numbers repeated chords on the same node", () => {
    const steps = stepsByChord(["C", "Cmaj7", "G7", "C"], chord => (chord === "Cmaj7" ? "C" : chord))
    expect(steps.get("C")).toEqual([1, 2, 4])
    expect(steps.get("G7")).toEqual([3])
  })
})
