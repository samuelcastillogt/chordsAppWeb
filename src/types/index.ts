export interface Chord {
  id: string
  root: string
  type: string
  family?: string
  label?: string
  notes?: string[]
  triad: string[]
  circlePosition: number
}

export interface CriterionBreakdown {
  raw: number
  weighted: number
  detail: string
}

export interface Connection {
  target: string
  score: number
  category: "natural" | "media" | "tensa" | "extrema"
  breakdown: Record<string, CriterionBreakdown>
  /** Present when the suggestion comes from a band style: score is then the blend. */
  engineScore?: number
  style?: StyleEvidence
}

export interface StyleEvidence {
  score: number
  probability: number
  numeral: string
  context: string[]
  count: number
  songs: number
  evidence: string
}

export interface ConnectionsResponse {
  source: string
  connections: Connection[]
  total: number
}

export interface Progression {
  id: string
  name: string
  chords: string[]
  tonality: string | null
  isPublic: boolean
  isOwner: boolean
  source: string | null
  createdAt: string
  updatedAt: string
}

/** The API's view of the signed-in user (the Firebase account lives in Firebase). */
export interface User {
  id: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
}

export interface ParsedChord {
  input: string
  chord: string | null
  bass: string | null
  approximated: boolean
  error: string | null
}

export type HarmonicFunction = "T" | "SD" | "D"
export type ChordRole = "diatonic" | "secondary_dominant" | "borrowed" | "chromatic"

export interface Substitution {
  chord: string
  kind: string
  reason: string
}

export interface Degree {
  input: string
  chord: string
  numeral: string
  function: HarmonicFunction | null
  role: ChordRole
  explanation: string
  approximated: boolean
  substitutions: Substitution[]
}

export interface KeyInfo {
  id: string
  label: string
  mode: "major" | "minor"
  confidence: number
  detected: boolean
}

export interface AnalyzeConnection extends Connection {
  source: string
}

export interface TensionPoint {
  from: string
  to: string
  score: number
  category: Connection["category"]
}

export interface AnalyzeResponse {
  analysis: {
    chords: string[]
    key: KeyInfo
    degrees: Degree[]
    connections: AnalyzeConnection[]
    tensionCurve: TensionPoint[]
    averageScore: number
    suggestions: string[]
  }
}

export interface TablatureResponse {
  title: string
  tuning: string[]
  chords: string[]
  lines: string[]
  arpeggioLines: string[]
  text: string
  diagrams: Array<{
    chord: string
    frets: string[]
  }>
}

export interface StylePattern {
  tokens: string[]
  numerals: string[]
  count: number
  songs: number
  loop: boolean
}

export interface StyleSong {
  title: string
  key: string
  keyLabel: string
  chords: string[]
}

/** A band's harmonic habits learned by the backend; stored as-is and sent back to /style/suggest. */
export interface StyleProfile {
  version: number
  name: string
  songs: StyleSong[]
  modes: Record<string, number>
  unigrams: Record<string, number>
  transitions: Record<string, { n: Record<string, number>; s: Record<string, number> }>
  colors: Record<string, Record<string, number>>
  usage: Record<string, { count: number; songs: number; role: string; numeral: string }>
  starts: Record<string, number>
  endings: Record<string, number>
  patterns: StylePattern[]
  traits: string[]
  skipped?: string[]
}

export interface StyleSource {
  title: string
  key: string
  text: string
}

export interface SavedStyle {
  id: string
  savedAt: string
  profile: StyleProfile
  /** The pasted songs, kept so the style can be edited and learned again. */
  sources?: StyleSource[]
}

export interface StyleSuggestResponse {
  source: string
  key: string
  context: string[]
  connections: Connection[]
  phrase: Array<{ chord: string; numeral: string }>
}

export interface StyleParseResponse {
  title: string
  chords: string[]
  sections: Array<{ name: string; chords: string[] }>
  key: string | null
  keyLabel: string | null
  tabChords: number
  unknown: string[]
}
