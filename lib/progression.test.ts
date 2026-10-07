import { describe, expect, it } from "vitest"

import { chordSeconds } from "@/lib/audio"
import { progressionToMidi, voiceChord } from "@/lib/midi"
import { changedIndices, moveItem } from "@/lib/progression"
import { slugify } from "@/lib/export"

describe("progression editing", () => {
  it("moves a chord to a new position", () => {
    expect(moveItem(["C", "G", "Am", "F"], 0, 2)).toEqual(["G", "Am", "C", "F"])
    expect(moveItem(["C", "G", "Am", "F"], 3, 0)).toEqual(["F", "C", "G", "Am"])
    // Targets past the end clamp to the last position.
    expect(moveItem(["C", "G"], 0, 9)).toEqual(["G", "C"])
  })

  it("ignores invalid moves", () => {
    const items = ["C", "G"]
    expect(moveItem(items, 5, 0)).toBe(items)
    expect(moveItem(items, 1, 1)).toBe(items)
  })

  it("finds the positions that differ between A and B", () => {
    expect(changedIndices(["C", "G", "Am", "F"], ["C", "Em", "Am", "F"])).toEqual([1])
    expect(changedIndices(["C", "G"], ["C", "G", "F"])).toEqual([2])
    expect(changedIndices(["C"], ["C"])).toEqual([])
  })
})

describe("playback and export helpers", () => {
  it("converts tempo to seconds per chord", () => {
    expect(chordSeconds(120)).toBe(1)
    expect(chordSeconds(60, 4)).toBe(4)
  })

  it("voices chords with the root as bass and ascending upper notes", () => {
    expect(voiceChord(["C", "E", "G"])).toEqual([48, 64, 67])
    expect(voiceChord(["G", "B", "D", "F"])).toEqual([55, 71, 74, 77])
    expect(voiceChord(["A", "C", "E"])).toEqual([57, 60, 64])
  })

  it("writes a valid single-track MIDI file", () => {
    const bytes = progressionToMidi([["C", "E", "G"], ["G", "B", "D"]], 120)
    const text = (start: number) => String.fromCharCode(...bytes.slice(start, start + 4))
    expect(text(0)).toBe("MThd")
    expect(text(14)).toBe("MTrk")
    const trackLength = (bytes[18] << 24) | (bytes[19] << 16) | (bytes[20] << 8) | bytes[21]
    expect(trackLength).toBe(bytes.length - 22)
    // 500000 µs per beat at 120 bpm.
    expect(Array.from(bytes.slice(26, 29))).toEqual([0x07, 0xa1, 0x20])
    const noteOns = Array.from(bytes).filter((byte, index) => byte === 0x90 && bytes[index + 2] === 80)
    expect(noteOns).toHaveLength(6)
    expect(Array.from(bytes.slice(-3))).toEqual([0xff, 0x2f, 0x00])
  })

  it("builds safe file names", () => {
    expect(slugify("Canción de prueba #1")).toBe("cancion-de-prueba-1")
    expect(slugify("¿?", "progresion")).toBe("progresion")
  })
})
