import { Key, KeyDegree } from "@/lib/music/mandala"
import { HarmonicProfile, Loop, NodeUse, ProfileSlice, Transition, moveName, spellChord } from "@/lib/music/songmap"
import { functionColor } from "@/lib/music/theory"

export const SLICES: Array<{ id: ProfileSlice; label: string; color: string; hint: string }> = [
  { id: "tonic", label: "Tónica", color: functionColor("T"), hint: "reposo" },
  { id: "subdominant", label: "Subdominante", color: functionColor("SD"), hint: "movimiento" },
  { id: "dominant", label: "Dominante", color: functionColor("D"), hint: "tensión" },
  { id: "secondary", label: "Dominantes secundarias", color: "#f08a6b", hint: "tensión prestada" },
  { id: "borrowed", label: "Préstamos", color: functionColor(null, "borrowed"), hint: "color modal" },
  { id: "outside", label: "Fuera de la tonalidad", color: "#6b7280", hint: "cromatismo" },
]

type Props = {
  songKey: Key
  /** Sections in another key: a modulation, or borrowing from the parallel key. */
  keyChanges: Array<{ section: string; key: Key; kind: "modulation" | "borrow" }>
  profile: HarmonicProfile
  usage: Map<string, NodeUse>
  transitions: Transition[]
  loops: Loop[]
  degreeOf: (node: string) => KeyDegree | null
  total: number
}

/** What the map says in words: key and modulations, harmonic profile, signature chords, moves and loops. */
export default function SongInsights({ songKey, keyChanges, profile, usage, transitions, loops, degreeOf, total }: Props) {
  const name = (node: string) => spellChord(usage.get(node)?.chords.length === 1 ? usage.get(node)!.chords[0] : node, songKey)
  const topChords = Array.from(usage.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const topMoves = transitions.slice(0, 6)
  const colorFor = (node: string) => {
    const degree = degreeOf(node)
    return degree ? functionColor(degree.function, degree.role) : "#6b7280"
  }
  const inKey = profile.tonic + profile.subdominant + profile.dominant

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-mute">Tonalidad</p>
        <h2 className="mt-1 text-3xl">{songKey.label}</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {Math.round(inKey * 100)}% de los acordes son de la tonalidad
          {profile.borrowed + profile.secondary + profile.outside > 0.05 ? "; el resto le da color." : "."}
        </p>
        {keyChanges.length ? (
          <ul className="mt-3 space-y-1 text-sm">
            {keyChanges.map(item =>
              item.kind === "modulation" ? (
                <li key={item.section} className="rounded-md border border-[#1c5a52]/30 bg-[#1c5a52]/5 px-3 py-2">
                  <strong>{item.section}</strong> modula a <strong>{item.key.label}</strong>
                  <span className="text-ink-mute"> (pétalo verde)</span>
                </li>
              ) : (
                <li key={item.section} className="rounded-md border border-fn-borrowed/30 bg-fn-borrowed/5 px-3 py-2">
                  <strong>{item.section}</strong> toma prestado de <strong>{item.key.label}</strong>
                  <span className="text-ink-mute"> (pétalo violeta): mismo centro, otro color</span>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="profile-title">
        <h2 id="profile-title" className="font-display text-xl">
          Huella armónica
        </h2>
        <div
          className="mt-3 flex h-4 overflow-hidden rounded-full"
          role="img"
          aria-label={SLICES.map(slice => `${slice.label} ${Math.round(profile[slice.id] * 100)}%`).join(", ")}
        >
          {SLICES.map(slice =>
            profile[slice.id] > 0 ? <span key={slice.id} style={{ width: `${profile[slice.id] * 100}%`, backgroundColor: slice.color }} /> : null,
          )}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {SLICES.filter(slice => profile[slice.id] > 0).map(slice => (
            <li key={slice.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span>
                {slice.label} <strong>{Math.round(profile[slice.id] * 100)}%</strong>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-mute">Sobre {total} acordes, contando cada vez que suenan.</p>
      </section>

      <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="chords-title">
        <h2 id="chords-title" className="font-display text-xl">
          Los acordes que mandan
        </h2>
        <ul className="mt-3 space-y-1.5">
          {topChords.map(use => {
            const degree = degreeOf(use.node)
            return (
              <li key={use.node} className="flex items-center gap-2 text-sm">
                <span className="w-12 font-mono font-bold">{name(use.node)}</span>
                <span className="w-12 font-display" style={{ color: colorFor(use.node) }}>
                  {degree?.numeral ?? "—"}
                </span>
                <span className="h-2 flex-1 rounded-full bg-hairline">
                  <span
                    className="block h-2 rounded-full"
                    style={{ width: `${(use.count / topChords[0].count) * 100}%`, backgroundColor: colorFor(use.node) }}
                  />
                </span>
                <span className="w-14 text-right text-xs text-ink-mute">{Math.round((use.count / total) * 100)}%</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="moves-title">
        <h2 id="moves-title" className="font-display text-xl">
          Movimientos característicos
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {topMoves.map(move => {
            const label = moveName(degreeOf(move.from), degreeOf(move.to))
            return (
              <li key={`${move.from}>${move.to}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono font-bold">
                  {name(move.from)} → {name(move.to)}
                </span>
                <span className="font-display text-ink-mute">
                  {degreeOf(move.from)?.numeral ?? "?"} → {degreeOf(move.to)?.numeral ?? "?"}
                </span>
                <span className="text-xs text-ink-mute">×{move.count}</span>
                {label ? <span className="rounded bg-surface-violet-soft/30 px-1.5 text-xs font-semibold">{label}</span> : null}
              </li>
            )
          })}
        </ul>
      </section>

      {loops.length ? (
        <section className="rounded-xl border border-hairline bg-canvas p-5 shadow-card" aria-labelledby="loops-title">
          <h2 id="loops-title" className="font-display text-xl">
            Patrones que se repiten
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {loops.map(loop => (
              <li key={loop.chords.join()}>
                <span className="font-mono font-bold">{loop.chords.map(chord => spellChord(chord, songKey)).join(" – ")}</span>{" "}
                <span className="font-display text-ink-mute">({loop.numerals.join("–")})</span>
                <span className="block text-xs text-ink-mute">
                  {loop.name ? <strong className="text-ink">{loop.name}</strong> : "Ciclo propio de la canción"}
                  {loop.count > 1 ? ` · suena ${loop.count} veces` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
