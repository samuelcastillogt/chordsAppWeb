import { NOTE_OFFSETS, CHROMATIC_NOTES } from "@/lib/music"
import { SavedStyle, StyleProfile, StyleSource } from "@/types"

/** Chord-id suffix of each backend chord type (same as the catalog ids: "C#m7", "G#°", "A5"). */
const TYPE_SUFFIX: Record<string, string> = {
  major: "",
  minor: "m",
  dim: "°",
  aug: "+",
  dom7: "7",
  dim7: "°7",
  maj7: "maj7",
  m7: "m7",
  m7b5: "m7b5",
  sus2: "sus2",
  sus4: "sus4",
  add9: "add9",
  "6": "6",
  m6: "m6",
  "9": "9",
  "5": "5",
}

const DEFAULT_TYPE: Record<string, string> = { maj: "major", min: "minor", dom: "dom7", dim: "dim", aug: "aug", sus: "sus4", pow: "5" }

/** Chord id of a key-relative token ("8:maj" → "G#" in Cm), in the colour the band plays it most. */
export function realizeToken(token: string, key: string, colors: StyleProfile["colors"] = {}): string | null {
  const [interval, quality] = token.split(":")
  const tonic = NOTE_OFFSETS[key.endsWith("m") ? key.slice(0, -1) : key]
  if (tonic === undefined || DEFAULT_TYPE[quality] === undefined) return null
  const root = CHROMATIC_NOTES[(tonic + Number(interval)) % 12]
  const played = colors[token]
  const type = played ? Object.entries(played).sort((a, b) => b[1] - a[1] || Number(b[0] === DEFAULT_TYPE[quality]) - Number(a[0] === DEFAULT_TYPE[quality]))[0][0] : DEFAULT_TYPE[quality]
  return `${root}${TYPE_SUFFIX[type] ?? ""}`
}

/** Most common mode among the band's songs, used to suggest a key for its patterns. */
export function dominantMode(profile: StyleProfile): "major" | "minor" {
  return (profile.modes.minor ?? 0) > (profile.modes.major ?? 0) ? "minor" : "major"
}

const STORAGE_KEY = "chordweaver:styles"

/** Profiles saved in this browser. Storage can be unavailable (private mode): then nothing is kept. */
export function loadStyles(): SavedStyle[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStyles(styles: SavedStyle[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(styles))
    return true
  } catch {
    return false
  }
}

/** Inserts or replaces a profile (same name = same band) and returns the new list. */
export function upsertStyle(styles: SavedStyle[], profile: StyleProfile, now = new Date(), sources?: StyleSource[]): { styles: SavedStyle[]; saved: SavedStyle } {
  const existing = styles.find(item => item.profile.name.toLowerCase() === profile.name.toLowerCase())
  const saved: SavedStyle = { id: existing?.id ?? `style-${now.getTime().toString(36)}`, savedAt: now.toISOString(), profile, sources }
  return { styles: [saved, ...styles.filter(item => item.id !== saved.id)], saved }
}
