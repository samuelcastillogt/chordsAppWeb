import { describe, expect, it } from "vitest"

import { dominantMode, realizeToken, upsertStyle } from "@/lib/style"
import { StyleProfile } from "@/types"

const profile = (name: string, modes = { major: 1, minor: 3 }) => ({ name, modes, colors: {} }) as unknown as StyleProfile

describe("band style helpers", () => {
  it("realizes key-relative tokens as catalog chord ids", () => {
    expect(realizeToken("8:maj", "Cm")).toBe("G#")
    expect(realizeToken("10:maj", "C")).toBe("A#")
    expect(realizeToken("0:min", "Am")).toBe("Am")
    expect(realizeToken("7:dom", "A")).toBe("E7")
    expect(realizeToken("11:dim", "C")).toBe("B°")
    expect(realizeToken("0:pow", "E")).toBe("E5")
    expect(realizeToken("8:maj", "Cm", { "8:maj": { maj7: 3, major: 1 } })).toBe("G#maj7")
    expect(realizeToken("8:maj", "H")).toBeNull()
  })

  it("reads the band's usual mode", () => {
    expect(dominantMode(profile("A"))).toBe("minor")
    expect(dominantMode(profile("B", { major: 2, minor: 2 }))).toBe("major")
  })

  it("replaces a saved style with the same band name", () => {
    const first = upsertStyle([], profile("Banda"), new Date(1000))
    const second = upsertStyle(first.styles, profile("banda"), new Date(2000))
    expect(second.styles).toHaveLength(1)
    expect(second.saved.id).toBe(first.saved.id)
    const other = upsertStyle(second.styles, profile("Otra"), new Date(3000))
    expect(other.styles.map(item => item.profile.name)).toEqual(["Otra", "banda"])
  })
})
