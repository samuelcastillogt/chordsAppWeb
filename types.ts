export interface Chord {
  id: string
  root: string
  type: string
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
  createdAt: string
  updatedAt: string
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
