import { describe, expect, it } from "vitest"

import { shareUrl, whatsappUrl } from "./share"

describe("share links", () => {
  const progression = { id: "abc 1", name: "Té para tres", chords: ["Bm", "G", "D", "A"] }

  it("points to the API preview page", () => {
    expect(shareUrl(progression)).toMatch(/\/p\/abc%201$/)
  })

  it("builds a WhatsApp message with the chords and the link", () => {
    const text = decodeURIComponent(whatsappUrl(progression).split("?text=")[1])
    expect(text).toContain("Té para tres: Bm – G – D – A")
    expect(text).toContain(shareUrl(progression))
  })
})
