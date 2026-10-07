import { describe, expect, it } from "vitest"

import { breakdownRows, explainConnection, rankSuggestions, styleScore } from "@/lib/music/suggestions"
import { Connection } from "@/types"

function connection(target: string, score: number, category: Connection["category"], raw: Partial<Record<string, number>>): Connection {
  const names = ["shared_notes", "voice_movement", "circle_distance", "transformation", "tonal_function", "dominant_chain", "glue_magic"]
  return {
    target,
    score,
    category,
    breakdown: Object.fromEntries(names.map(name => [name, { raw: raw[name] ?? 0, weighted: (raw[name] ?? 0) / 10, detail: `${name} de ${target}` }])),
  }
}

const AM = connection("Am", 78, "natural", { shared_notes: 90, tonal_function: 90, transformation: 85 })
const G7 = connection("G7", 64, "media", { dominant_chain: 100, voice_movement: 90, tonal_function: 60 })
const AB = connection("Ab", 41, "tensa", { transformation: 90, glue_magic: 100, shared_notes: 60 })
const FS = connection("F#", 12, "extrema", {})
const ALL = [AM, G7, AB, FS]

describe("suggestions", () => {
  it("filters by intention mode", () => {
    expect(rankSuggestions(ALL, "all", "balanced").map(item => item.target)).toEqual(["Am", "G7", "Ab", "F#"])
    expect(rankSuggestions(ALL, "safe", "balanced").map(item => item.target)).toEqual(["Am"])
    expect(rankSuggestions(ALL, "interesting", "balanced").map(item => item.target)).toEqual(["G7"])
    expect(rankSuggestions(ALL, "bold", "balanced").map(item => item.target)).toEqual(["Ab", "F#"])
  })

  it("keeps the engine score for the balanced preset", () => {
    expect(styleScore(AM, "balanced")).toBe(78)
  })

  it("re-ranks by style preset", () => {
    expect(rankSuggestions(ALL, "all", "jazz")[0].target).toBe("G7")
    expect(rankSuggestions(ALL, "all", "pop")[0].target).toBe("Am")
    expect(rankSuggestions(ALL, "all", "cinematic")[0].target).toBe("Ab")
  })

  it("limits the number of suggestions", () => {
    expect(rankSuggestions(ALL, "all", "balanced", 2)).toHaveLength(2)
  })

  it("explains a connection with its two strongest criteria", () => {
    expect(explainConnection(G7)).toBe("dominant_chain de G7 · voice_movement de G7")
    expect(explainConnection(FS)).toBe("")
  })

  it("returns breakdown rows in a stable, labelled order", () => {
    const rows = breakdownRows(AM)
    expect(rows.map(row => row.name)).toEqual([
      "shared_notes",
      "voice_movement",
      "circle_distance",
      "transformation",
      "tonal_function",
      "dominant_chain",
      "glue_magic",
    ])
    expect(rows[0]).toMatchObject({ label: "Notas en común", raw: 90 })
  })
})
