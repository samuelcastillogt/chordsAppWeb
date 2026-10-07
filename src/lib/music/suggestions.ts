import { Connection } from "@/types"

/** The seven criteria the backend engine scores every chord change with (raw 0-100). */
export const CRITERIA = ["shared_notes", "voice_movement", "circle_distance", "transformation", "tonal_function", "dominant_chain", "glue_magic"] as const

export type Criterion = (typeof CRITERIA)[number]

export const CRITERION_LABELS: Record<Criterion, string> = {
  shared_notes: "Notas en común",
  voice_movement: "Movimiento de voces",
  circle_distance: "Círculo de quintas",
  transformation: "Tipo de movimiento",
  tonal_function: "Encaje en la tonalidad",
  dominant_chain: "Cadena de dominantes",
  glue_magic: "Nota puente",
}

/** Intention modes from the PRD: how adventurous the next chord should feel. */
export type SuggestionMode = "all" | "safe" | "interesting" | "bold"

export const SUGGESTION_MODES: Array<{ id: SuggestionMode; label: string; hint: string }> = [
  { id: "all", label: "Todas", hint: "Todas las conexiones ordenadas por puntuación." },
  { id: "safe", label: "Segura", hint: "Cambios naturales que casi siempre funcionan." },
  { id: "interesting", label: "Interesante", hint: "Un poco de color sin perder el hilo." },
  { id: "bold", label: "Atrevida", hint: "Tensión y sorpresa: úsalas con intención." },
]

const MODE_CATEGORIES: Record<SuggestionMode, Connection["category"][]> = {
  all: ["natural", "media", "tensa", "extrema"],
  safe: ["natural"],
  interesting: ["media"],
  bold: ["tensa", "extrema"],
}

/** Style presets re-weight the same criteria; "balanced" keeps the engine's own weights. */
export type StylePreset = "balanced" | "pop" | "jazz" | "cinematic"

export const STYLE_PRESETS: Array<{ id: StylePreset; label: string; hint: string }> = [
  { id: "balanced", label: "Equilibrado", hint: "Los pesos del motor tal cual." },
  { id: "pop", label: "Pop", hint: "Prioriza acordes de la tonalidad y cambios con notas en común." },
  { id: "jazz", label: "Jazz-lite", hint: "Prioriza cadenas de dominantes y voces que se mueven poco." },
  { id: "cinematic", label: "Cinemático", hint: "Prioriza paralelos, relativos y notas puente aunque salgan de la tonalidad." },
]

const STYLE_WEIGHTS: Record<Exclude<StylePreset, "balanced">, Record<Criterion, number>> = {
  pop: { shared_notes: 0.25, voice_movement: 0.1, circle_distance: 0.15, transformation: 0.1, tonal_function: 0.3, dominant_chain: 0.05, glue_magic: 0.05 },
  jazz: { shared_notes: 0.1, voice_movement: 0.25, circle_distance: 0.15, transformation: 0.1, tonal_function: 0.1, dominant_chain: 0.25, glue_magic: 0.05 },
  cinematic: { shared_notes: 0.2, voice_movement: 0.15, circle_distance: 0.05, transformation: 0.35, tonal_function: 0.05, dominant_chain: 0, glue_magic: 0.2 },
}

/** Score of a connection under a style preset, on the same 0-100 scale as the engine. */
export function styleScore(connection: Connection, preset: StylePreset): number {
  // A band style already blended its habits with the engine: presets would undo that.
  if (preset === "balanced" || connection.style) return connection.score
  const weights = STYLE_WEIGHTS[preset]
  const total = CRITERIA.reduce((sum, name) => sum + (connection.breakdown[name]?.raw ?? 0) * weights[name], 0)
  return Math.round(total * 10) / 10
}

export type RankedSuggestion = Connection & { rankScore: number; explanation: string }

/** Filters by intention mode and orders by the style preset score. */
export function rankSuggestions(connections: Connection[], mode: SuggestionMode, preset: StylePreset, limit = 18): RankedSuggestion[] {
  const allowed = MODE_CATEGORIES[mode]
  return connections
    .filter(connection => allowed.includes(connection.category))
    .map(connection => ({ ...connection, rankScore: styleScore(connection, preset), explanation: explainConnection(connection) }))
    .sort((a, b) => b.rankScore - a.rankScore || a.target.localeCompare(b.target))
    .slice(0, limit)
}

/** Short human explanation: the details of the two criteria that contribute most. */
export function explainConnection(connection: Connection): string {
  if (connection.style) return connection.style.evidence
  return Object.entries(connection.breakdown)
    .filter(([, item]) => item.weighted > 0 && item.detail)
    .sort(([, a], [, b]) => b.weighted - a.weighted)
    .slice(0, 2)
    .map(([, item]) => item.detail)
    .join(" · ")
}

export type BreakdownRow = { name: Criterion; label: string; raw: number; weighted: number; detail: string }

/** Breakdown rows in a stable order, ready to render as bars. */
export function breakdownRows(connection: Connection): BreakdownRow[] {
  return CRITERIA.filter(name => connection.breakdown[name]).map(name => ({
    name,
    label: CRITERION_LABELS[name],
    raw: connection.breakdown[name].raw,
    weighted: connection.breakdown[name].weighted,
    detail: connection.breakdown[name].detail,
  }))
}
