import { CHROMATIC_NOTES, NOTE_OFFSETS } from "@/lib/music"
import { ChordRole, HarmonicFunction } from "@/types"

/**
 * Harmonic mandala: every chord family on its own ring, every ring aligned so a key
 * is a single "petal" of three spokes (IV-I-V on top, ii-vi-iii under them, vii° in the
 * middle) and the dominant 7ths orbit right outside the chord they resolve to.
 */

export type MandalaFamily = "dominant" | "major" | "minor" | "diminished" | "augmented"

export const MANDALA_FAMILIES: Array<{ id: MandalaFamily; label: string }> = [
  { id: "dominant", label: "7 dominantes" },
  { id: "major", label: "Mayores" },
  { id: "minor", label: "Menores" },
  { id: "diminished", label: "Disminuidos" },
  { id: "augmented", label: "Aumentados" },
]

export const MANDALA_SIZE = 640
export const MANDALA_CENTER = MANDALA_SIZE / 2

export const RING_RADIUS: Record<MandalaFamily, number> = {
  dominant: 284,
  major: 226,
  minor: 166,
  diminished: 110,
  augmented: 58,
}

export const NODE_RADIUS: Record<MandalaFamily, number> = {
  dominant: 15,
  major: 19,
  minor: 16,
  diminished: 13,
  augmented: 11,
}

const SUFFIX: Record<MandalaFamily, string> = { dominant: "7", major: "", minor: "m", diminished: "°", augmented: "+" }

const TYPE_FAMILY: Record<string, MandalaFamily> = {
  major: "major",
  maj7: "major",
  add9: "major",
  "6": "major",
  sus2: "major",
  sus4: "major",
  "5": "major",
  minor: "minor",
  m7: "minor",
  m6: "minor",
  dom7: "dominant",
  "9": "dominant",
  dim: "diminished",
  m7b5: "diminished",
  dim7: "diminished",
  aug: "augmented",
}

export function familyOf(type: string): MandalaFamily | null {
  return TYPE_FAMILY[type] ?? null
}

/** Node a catalog chord lives on: extensions share the node of their family (Cmaj7 → C, Bm7b5 → B°). */
export function mandalaNodeId(chord: { root: string; type: string }): string | null {
  const family = familyOf(chord.type)
  return family ? `${chord.root}${SUFFIX[family]}` : null
}

/** Position of a pitch class in the circle of fifths (C=0, G=1, ... F=11). */
export function circleIndex(pitchClass: number): number {
  return (((pitchClass * 7) % 12) + 12) % 12
}

export type Key = { tonic: number; mode: "major" | "minor"; label: string }

export function parseKey(id: string): Key | null {
  const minor = id.endsWith("m")
  const root = minor ? id.slice(0, -1) : id
  const tonic = NOTE_OFFSETS[root]
  if (tonic === undefined) return null
  return { tonic, mode: minor ? "minor" : "major", label: `${root} ${minor ? "menor" : "mayor"}` }
}

/** Spoke (0-11, circle-of-fifths order) a node sits on. */
export function spokeOf(rootPc: number, family: MandalaFamily): number {
  if (family === "minor") return circleIndex(rootPc + 3) // under its relative major
  if (family === "diminished") return circleIndex(rootPc + 1) // under the key where it is vii°
  if (family === "dominant") return circleIndex(rootPc + 5) // outside the chord it resolves to
  return circleIndex(rootPc)
}

/** Spoke at the centre of a key's petal. */
export function keySpoke(key: Key): number {
  return key.mode === "major" ? circleIndex(key.tonic) : circleIndex(key.tonic + 3)
}

/** Spoke at the centre of the parallel key's petal (where borrowed chords come from). */
export function parallelSpoke(key: Key): number {
  return (keySpoke(key) + (key.mode === "major" ? 9 : 3)) % 12
}

/** Screen angle (radians) of a spoke once the mandala is rotated so the key's tonic is on top. */
export function spokeAngle(spoke: number, key: Key): number {
  const relative = (((spoke - keySpoke(key)) % 12) + 12) % 12
  return (relative * Math.PI) / 6 - Math.PI / 2
}

export type KeyDegree = { numeral: string; function: HarmonicFunction | null; role: ChordRole }

type Table = Partial<Record<MandalaFamily, Record<number, [string, HarmonicFunction]>>>

const MAJOR_DIATONIC: Table = {
  major: { 0: ["I", "T"], 5: ["IV", "SD"], 7: ["V", "D"] },
  minor: { 2: ["ii", "SD"], 4: ["iii", "T"], 9: ["vi", "T"] },
  diminished: { 11: ["vii°", "D"] },
  dominant: { 7: ["V7", "D"] },
}

const MAJOR_BORROWED: Table = {
  major: { 3: ["♭III", "T"], 8: ["♭VI", "SD"], 10: ["♭VII", "SD"] },
  minor: { 0: ["i", "T"], 5: ["iv", "SD"], 7: ["v", "D"] },
  diminished: { 2: ["ii°", "SD"] },
  dominant: { 10: ["♭VII7", "SD"] },
}

const MINOR_DIATONIC: Table = {
  minor: { 0: ["i", "T"], 5: ["iv", "SD"], 7: ["v", "D"] },
  major: { 3: ["III", "T"], 7: ["V", "D"], 8: ["VI", "T"], 10: ["VII", "D"] },
  diminished: { 2: ["ii°", "SD"], 11: ["vii°", "D"] },
  dominant: { 7: ["V7", "D"] },
}

const MINOR_BORROWED: Table = {
  major: { 0: ["I", "T"], 5: ["IV", "SD"] },
  minor: { 2: ["ii", "SD"], 9: ["vi", "T"] },
}

function lookup(table: Table, family: MandalaFamily, interval: number) {
  return table[family]?.[interval] ?? null
}

/** Roman numeral, function and role of a chord in a key (null when it is outside it). */
export function degreeInKey(rootPc: number, family: MandalaFamily, key: Key): KeyDegree | null {
  const interval = (rootPc - key.tonic + 12) % 12
  const diatonicTable = key.mode === "major" ? MAJOR_DIATONIC : MINOR_DIATONIC
  const diatonic = lookup(diatonicTable, family, interval)
  if (diatonic) return { numeral: diatonic[0], function: diatonic[1], role: "diatonic" }

  const borrowed = lookup(key.mode === "major" ? MAJOR_BORROWED : MINOR_BORROWED, family, interval)
  if (borrowed) return { numeral: borrowed[0], function: borrowed[1], role: "borrowed" }

  // Secondary dominant: a major or 7th chord a fifth above a diatonic, non-tonic, non-diminished chord.
  if (family === "major" || family === "dominant") {
    const targetInterval = (interval + 5) % 12
    const target = targetInterval === 0 ? null : lookup(diatonicTable, "major", targetInterval) ?? lookup(diatonicTable, "minor", targetInterval)
    if (target) return { numeral: `${family === "dominant" ? "V7" : "V"}/${target[0]}`, function: "D", role: "secondary_dominant" }
  }
  return null
}

export type MandalaNode = {
  id: string
  root: string
  family: MandalaFamily
  spoke: number
  angle: number
  radius: number
  x: number
  y: number
  degree: KeyDegree | null
}

export function polar(angle: number, radius: number) {
  return { x: MANDALA_CENTER + radius * Math.cos(angle), y: MANDALA_CENTER + radius * Math.sin(angle) }
}

/** All nodes for the visible families, rotated and coloured for `key`. */
export function buildMandala(key: Key, families: MandalaFamily[]): MandalaNode[] {
  return families.flatMap(family =>
    CHROMATIC_NOTES.map(root => {
      const pc = NOTE_OFFSETS[root]
      const spoke = spokeOf(pc, family)
      const angle = spokeAngle(spoke, key)
      const radius = RING_RADIUS[family]
      return { id: `${root}${SUFFIX[family]}`, root, family, spoke, angle, radius, ...polar(angle, radius), degree: degreeInKey(pc, family, key) }
    }),
  )
}

/** Annular sector covering three spokes around `centerSpoke` (a key "petal"). */
export function petalPath(centerSpoke: number, key: Key, inner = 84, outer = 312): string {
  const center = spokeAngle(centerSpoke, key)
  const half = Math.PI / 4
  const a0 = center - half
  const a1 = center + half
  const p0 = polar(a0, outer)
  const p1 = polar(a1, outer)
  const p2 = polar(a1, inner)
  const p3 = polar(a0, inner)
  return `M${p0.x},${p0.y} A${outer},${outer} 0 0 1 ${p1.x},${p1.y} L${p2.x},${p2.y} A${inner},${inner} 0 0 0 ${p3.x},${p3.y} Z`
}

/**
 * Curve between two points bowed toward the centre, shortened so it starts and ends at the
 * node edges (`padStart`, `padEnd`). `bend` 0 = straight, 1 = through the centre.
 */
export function curvePath(from: { x: number; y: number }, to: { x: number; y: number }, bend = 0.35, padStart = 0, padEnd = 0): string {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const control = { x: mid.x + (MANDALA_CENTER - mid.x) * bend, y: mid.y + (MANDALA_CENTER - mid.y) * bend }
  const trim = (point: { x: number; y: number }, toward: { x: number; y: number }, pad: number) => {
    const dx = toward.x - point.x
    const dy = toward.y - point.y
    const length = Math.hypot(dx, dy) || 1
    return { x: point.x + (dx / length) * pad, y: point.y + (dy / length) * pad }
  }
  const start = trim(from, control, padStart)
  const end = trim(to, control, padEnd)
  const round = (value: number) => Math.round(value * 10) / 10
  return `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(end.x)},${round(end.y)}`
}
