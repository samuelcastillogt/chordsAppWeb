import { displayName } from "@/lib/music/keys"
import { Key, KeyDegree } from "@/lib/music/mandala"

/**
 * The harmony of a whole song as a graph: how often each chord sounds, which moves it makes and
 * how often, its harmonic profile and the moves and loops that define it. Pure functions over the
 * sections the sheet parser returns; the mandala draws the result.
 */

export type SongSection = { name: string; chords: string[] }

export type SongStep = { chord: string; node: string; section: number }

/** Every chord of the song in order, with the mandala node it lands on (Am7 → Am). */
export function songSteps(sections: SongSection[], toNode: (chord: string) => string): SongStep[] {
  return sections.flatMap((section, index) => section.chords.map(chord => ({ chord, node: toNode(chord), section: index })))
}

/** Steps without back-to-back repeats of the same chord: what playback and loops should follow. */
export function collapseSteps(steps: SongStep[]): SongStep[] {
  return steps.filter((step, index) => index === 0 || step.chord !== steps[index - 1].chord)
}

export type NodeUse = { node: string; count: number; sections: number[]; chords: string[] }

/** How many times each node sounds, in which sections, and the chord spellings that land on it. */
export function nodeUsage(steps: SongStep[]): Map<string, NodeUse> {
  const usage = new Map<string, NodeUse>()
  for (const step of steps) {
    const use = usage.get(step.node) ?? { node: step.node, count: 0, sections: [], chords: [] }
    use.count += 1
    if (!use.sections.includes(step.section)) use.sections.push(step.section)
    if (!use.chords.includes(step.chord)) use.chords.push(step.chord)
    usage.set(step.node, use)
  }
  return usage
}

export type Transition = { from: string; to: string; count: number; sections: number[] }

/** Moves between different nodes, most frequent first. A move belongs to the section it lands in. */
export function songTransitions(steps: SongStep[]): Transition[] {
  const byPair = new Map<string, Transition>()
  steps.forEach((step, index) => {
    const previous = steps[index - 1]
    if (!previous || previous.node === step.node) return
    const id = `${previous.node}>${step.node}`
    const transition = byPair.get(id) ?? { from: previous.node, to: step.node, count: 0, sections: [] }
    transition.count += 1
    if (!transition.sections.includes(step.section)) transition.sections.push(step.section)
    byPair.set(id, transition)
  })
  return Array.from(byPair.values()).sort((a, b) => b.count - a.count || a.from.localeCompare(b.from))
}

export type ProfileSlice = "tonic" | "subdominant" | "dominant" | "secondary" | "borrowed" | "outside"
export type HarmonicProfile = Record<ProfileSlice, number>

export function sliceOf(degree: KeyDegree | null): ProfileSlice {
  if (!degree) return "outside"
  if (degree.role === "borrowed") return "borrowed"
  if (degree.role === "secondary_dominant") return "secondary"
  return degree.function === "T" ? "tonic" : degree.function === "SD" ? "subdominant" : "dominant"
}

/** Share of the song's chords (by occurrences, 0..1) in each harmonic function. */
export function harmonicProfile(usage: Map<string, NodeUse>, degreeOf: (node: string) => KeyDegree | null): HarmonicProfile {
  const profile: HarmonicProfile = { tonic: 0, subdominant: 0, dominant: 0, secondary: 0, borrowed: 0, outside: 0 }
  let total = 0
  usage.forEach(use => {
    profile[sliceOf(degreeOf(use.node))] += use.count
    total += use.count
  })
  if (total) (Object.keys(profile) as ProfileSlice[]).forEach(slice => (profile[slice] /= total))
  return profile
}

/** Numeral without the seventh, for matching patterns ("V7" → "V", "V7/ii" stays as is). */
function core(numeral: string): string {
  return numeral.includes("/") ? numeral : numeral.replace(/7$/, "")
}

/** A name for a well-known move between two degrees, or null. */
export function moveName(from: KeyDegree | null, to: KeyDegree | null): string | null {
  if (!from || !to) return null
  const a = core(from.numeral)
  const b = core(to.numeral)
  if (from.role === "secondary_dominant" && from.numeral.split("/")[1] === to.numeral.replace(/7$/, "")) return "Dominante secundaria que resuelve"
  if ((a === "V" || a === "vii°") && (b === "I" || b === "i")) return "Cadencia auténtica"
  if ((a === "IV" || a === "iv") && b === "I") return a === "iv" ? "Cadencia plagal menor" : "Cadencia plagal"
  if (a === "iv" && b === "i") return "Cadencia plagal"
  if (a === "V" && (b === "vi" || b === "VI")) return "Cadencia rota"
  if ((a === "♭VII" || a === "VII") && (b === "I" || b === "i")) return a === "♭VII" ? "Cadencia mixolidia" : "Subtónica que vuelve"
  if ((a === "ii" || a === "ii°") && a !== b && b === "V") return "ii–V"
  if (a === "♭VI" && b === "♭VII") return "Ascenso épico"
  return null
}

// Matched in any rotation: vi–IV–I–V is the pop progression starting on vi.
const FAMOUS_LOOPS: Array<{ numerals: string[]; name: string }> = [
  { numerals: ["I", "V", "vi", "IV"], name: "La progresión pop (I–V–vi–IV)" },
  { numerals: ["I", "vi", "IV", "V"], name: "Progresión de los años 50" },
  { numerals: ["i", "VII", "VI", "V"], name: "Cadencia andaluza" },
  { numerals: ["ii", "V", "I"], name: "ii–V–I del jazz" },
  { numerals: ["♭VI", "♭VII", "I"], name: "Cadencia épica (♭VI–♭VII–I)" },
  { numerals: ["I", "♭VII", "IV"], name: "Rock mixolidio (I–♭VII–IV)" },
  { numerals: ["I", "IV", "V"], name: "Los tres acordes del rock y el blues" },
]

function isRotation(window: string[], pattern: string[]): boolean {
  if (window.length !== pattern.length) return false
  return pattern.some((_, shift) => pattern.every((numeral, index) => window[(index + shift) % window.length] === numeral))
}

export type Loop = { chords: string[]; numerals: string[]; count: number; name: string | null }

/**
 * Chord cycles that repeat (3 or 4 chords, seen at least twice), named when they are a known
 * progression in any rotation. Overlapping windows of the same cycle are reported once.
 */
export function songLoops(steps: SongStep[], degreeOf: (node: string) => KeyDegree | null, limit = 3): Loop[] {
  const sequence = collapseSteps(steps)
  const found = new Map<string, Loop>()
  for (const size of [4, 3]) {
    for (let start = 0; start + size <= sequence.length; start++) {
      const window = sequence.slice(start, start + size)
      if (new Set(window.map(step => step.node)).size !== size) continue
      const id = window.map(step => step.chord).join(" ")
      const existing = found.get(id)
      if (existing) {
        existing.count += 1
        continue
      }
      const numerals = window.map(step => core(degreeOf(step.node)?.numeral ?? "?"))
      const name = FAMOUS_LOOPS.find(loop => isRotation(numerals, loop.numerals))?.name ?? null
      found.set(id, { chords: window.map(step => step.chord), numerals, count: 1, name })
    }
  }
  // A 4-chord cycle repeating also counts each of its rotations: keep one per set of chords.
  const loops = Array.from(found.values())
    .filter(loop => loop.count >= 2 || loop.name)
    .sort((a, b) => Number(!!b.name) - Number(!!a.name) || b.count - a.count || b.chords.length - a.chords.length)
  const kept: Loop[] = []
  for (const loop of loops) {
    const set = [...loop.chords].sort().join()
    if (kept.some(other => [...other.chords].sort().join() === set || (loop.chords.length === 3 && loop.chords.every(chord => other.chords.includes(chord)))))
      continue
    kept.push(loop)
    if (kept.length === limit) break
  }
  return kept
}

/** "Coro", "Coro 2"… readable section names; chords before any header are the "Inicio". */
export function sectionLabels(sections: SongSection[]): string[] {
  const seen = new Map<string, number>()
  return sections.map(section => {
    const base = section.name ? section.name.charAt(0).toUpperCase() + section.name.slice(1).replace(/-/g, " ") : "Inicio"
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count > 1 ? `${base} ${count}` : base
  })
}

// Major keys written with sharps (and their relative minors); the rest use flats.
const SHARP_MAJOR_TONICS = new Set([7, 2, 9, 4, 11, 6])

/** Chord name spelled for the key: A# in B major, B♭ in C or F. */
export function spellChord(id: string, key: Key | null): string {
  if (!key) return displayName(id)
  const majorTonic = key.mode === "major" ? key.tonic : (key.tonic + 3) % 12
  return SHARP_MAJOR_TONICS.has(majorTonic) ? id : displayName(id)
}

/** Node radius grows with the square root of use, so one dominant chord doesn't swallow the rest. */
export function usedRadius(count: number, max: number, base: number): number {
  return base * (0.8 + 0.75 * Math.sqrt(count / Math.max(max, 1)))
}

/** The analyzer hands the last uploaded song to the map through sessionStorage (this tab only). */
export const HANDOFF_KEY = "chordweaver:song-map"

export function storeSongHandoff(title: string, text: string) {
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ title, text }))
  } catch {
    // Storage blocked (private mode): the map simply starts empty.
  }
}

export function readSongHandoff(): { title: string; text: string } | null {
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY)
    const value = raw ? JSON.parse(raw) : null
    return value && typeof value.text === "string" && typeof value.title === "string" ? value : null
  } catch {
    return null
  }
}
