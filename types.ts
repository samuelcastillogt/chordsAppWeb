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

export interface User {
  id: string
  email: string
  displayName: string | null
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  user: User
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
