"use client"

import { useEffect, useMemo, useState } from "react"

import {
  MANDALA_CENTER,
  MANDALA_FAMILIES,
  MANDALA_SIZE,
  MandalaFamily,
  MandalaNode,
  NODE_RADIUS,
  RING_RADIUS,
  buildMandala,
  curvePath,
  keySpoke,
  mandalaNodeId,
  parallelSpoke,
  parseKey,
  petalPath,
} from "@/lib/mandala"
import { categoryColor, connectionLabel, functionColor, functionLabel } from "@/lib/music"
import { Chord, Connection } from "@/types"

type Path = Connection & { explanation?: string }

type Props = {
  chords: Chord[]
  selected: string
  tonality: string
  /** Ranked connections from the selected chord (already filtered by intention/style). */
  connections: Path[]
  progression: string[]
  playingIndex: number | null
  onSelect: (chord: string) => void
  /** Adds a chord to the end of the progression. */
  onAdd: (chord: string) => void
  /** Plays a short sequence of chord ids; `id` identifies it so the button can show it is sounding. */
  onPreview: (chordIds: string[], id: string) => void
  onStopPreview: () => void
  playingId: string | null
}

type Layer = "key" | "paths" | "thread"

const MAX_PATHS = 8
// Room for the outer ring's numerals.
const VIEW_PAD = 28
const CATEGORIES: Connection["category"][] = ["natural", "media", "tensa", "extrema"]

export default function HarmonicMandala(props: Props) {
  const { chords, selected, tonality, connections, progression, playingIndex, onSelect, onAdd, onPreview, onStopPreview, playingId } = props
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ key: true, paths: true, thread: true })
  const [families, setFamilies] = useState<Record<MandalaFamily, boolean>>({ dominant: true, major: true, minor: true, diminished: true, augmented: false })
  const [hovered, setHovered] = useState<string | null>(null)
  // Clicking a node pins its card so the chord can be auditioned before adding or exploring it.
  const [pinned, setPinned] = useState<string | null>(null)

  useEffect(() => {
    if (!pinned) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPinned(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pinned])

  const key = parseKey(tonality) ?? parseKey("C")!
  const visibleFamilies = MANDALA_FAMILIES.map(item => item.id).filter(id => families[id])
  const nodes = useMemo(() => buildMandala(key, visibleFamilies), [key.tonic, key.mode, visibleFamilies.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const nodeById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])

  // Catalog id → node id (Cmaj7 → C), so extensions in suggestions and progressions land on a node.
  const toNode = useMemo(() => {
    const map = new Map<string, string>()
    chords.forEach(chord => {
      const id = mandalaNodeId(chord)
      if (id) map.set(chord.id, id)
    })
    return (chordId: string) => map.get(chordId) ?? chordId
  }, [chords])

  const selectedNode = nodeById.get(toNode(selected)) ?? null

  // One path per target node: the best-ranked chord that lands on it.
  const paths = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ node: MandalaNode; connection: Path }> = []
    for (const connection of connections) {
      const node = nodeById.get(toNode(connection.target))
      if (!node || node.id === selectedNode?.id || seen.has(node.id)) continue
      seen.add(node.id)
      result.push({ node, connection })
      if (result.length === MAX_PATHS) break
    }
    return result
  }, [connections, nodeById, toNode, selectedNode])
  const pathByNode = new Map(paths.map(path => [path.node.id, path]))

  const threadNodes = progression
    .map(id => nodeById.get(toNode(id)) ?? null)
    .map((node, index) => ({ node, index }))
    .filter((item): item is { node: MandalaNode; index: number } => item.node !== null)
  const stepsByNode = new Map<string, number[]>()
  threadNodes.forEach(({ node, index }) => stepsByNode.set(node.id, [...(stepsByNode.get(node.id) ?? []), index + 1]))

  const focusId = hovered ?? pinned
  const focus = focusId
    ? new Set([focusId, pinned ?? "", selectedNode?.id ?? "", ...(focusId === selectedNode?.id ? paths.map(path => path.node.id) : [])])
    : null
  // A pinned card wins over hover so its buttons stay reachable.
  const cardId = pinned ?? hovered
  const cardNode = cardId ? nodeById.get(cardId) ?? null : null
  const cardPath = cardId ? pathByNode.get(cardId) ?? null : null
  // Label shown on a node: the actual chord when the selection is an extension (Cmaj7 on node C).
  const labelOf = (node: MandalaNode) => (node.id === selectedNode?.id && selected !== node.id ? selected : node.id)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Capas</legend>
          <Toggle on={layers.key} onClick={() => setLayers(current => ({ ...current, key: !current.key }))}>Tonalidad</Toggle>
          <Toggle on={layers.paths} onClick={() => setLayers(current => ({ ...current, paths: !current.paths }))}>Caminos</Toggle>
          <Toggle on={layers.thread} onClick={() => setLayers(current => ({ ...current, thread: !current.thread }))}>Hilo de tu progresión</Toggle>
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Familias</legend>
          {MANDALA_FAMILIES.map(family => (
            <Toggle key={family.id} on={families[family.id]} onClick={() => setFamilies(current => ({ ...current, [family.id]: !current[family.id] }))}>
              {family.label}
            </Toggle>
          ))}
        </fieldset>
      </div>

      <div className="relative">
        <svg
          viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${MANDALA_SIZE + VIEW_PAD * 2} ${MANDALA_SIZE + VIEW_PAD * 2}`}
          className="h-auto w-full select-none"
          role="group"
          aria-label={`Mandala armónico en ${key.label}`}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            {CATEGORIES.map(category => (
              <marker key={category} id={`mandala-arrow-${category}`} viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,-4.5L9,0L0,4.5Z" fill={categoryColor(category)} />
              </marker>
            ))}
          </defs>

          {/* Petals: the key's three spokes and the parallel key's (where borrowed chords live). */}
          {layers.key ? (
            <g>
              <path d={petalPath(keySpoke(key), key)} fill="#f2c14e" fillOpacity={0.16} stroke="#f2c14e" strokeOpacity={0.5} />
              <path d={petalPath(parallelSpoke(key), key)} fill="#7b5cd6" fillOpacity={0.07} stroke="#7b5cd6" strokeOpacity={0.25} strokeDasharray="4 6" />
            </g>
          ) : null}

          {/* Rings and spokes */}
          <g fill="none" stroke="#e7dfd0">
            {visibleFamilies.map(family => <circle key={family} cx={MANDALA_CENTER} cy={MANDALA_CENTER} r={RING_RADIUS[family]} strokeDasharray={family === "major" ? undefined : "2 6"} />)}
          </g>

          {!families.augmented && layers.key ? (
            <text x={MANDALA_CENTER} y={MANDALA_CENTER + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill="#6b645a" fontFamily="var(--font-display)">
              {key.label}
            </text>
          ) : null}

          {/* Thread: the user's progression woven over the mandala. */}
          {layers.thread && threadNodes.length > 1 ? (
            <g fill="none" strokeLinecap="round">
              {threadNodes.slice(1).map(({ node, index }, step) => {
                const from = threadNodes[step].node
                if (from.id === node.id) return null
                const d = curvePath(from, node, 0.22, NODE_RADIUS[from.family], NODE_RADIUS[node.family])
                const active = playingIndex === index
                return (
                  <g key={`${from.id}-${node.id}-${index}`} opacity={focus ? 0.35 : 1}>
                    <path d={d} stroke="#f2c14e" strokeWidth={active ? 10 : 7} strokeOpacity={active ? 0.9 : 0.55} />
                    <path d={d} stroke="#1f1b16" strokeWidth={active ? 2.5 : 1.4} />
                  </g>
                )
              })}
            </g>
          ) : null}

          {/* Paths from the selected chord, coloured by how they sound. */}
          {layers.paths && selectedNode ? (
            <g fill="none" strokeLinecap="round">
              {paths.map(({ node, connection }) => {
                const dim = focus && !focus.has(node.id)
                return (
                  <path
                    key={node.id}
                    d={curvePath(selectedNode, node, 0.4, NODE_RADIUS[selectedNode.family] + 2, NODE_RADIUS[node.family] + 5)}
                    stroke={categoryColor(connection.category)}
                    strokeWidth={1.4 + connection.score / 28}
                    strokeOpacity={dim ? 0.12 : 0.85}
                    markerEnd={`url(#mandala-arrow-${connection.category})`}
                  />
                )
              })}
            </g>
          ) : null}

          {/* Nodes */}
          {nodes.map(node => {
            const degree = node.degree
            const inKey = layers.key && degree !== null
            const fill = inKey ? functionColor(degree.function, degree.role) : "#fffdf8"
            const isSelected = node.id === selectedNode?.id
            const steps = layers.thread ? stepsByNode.get(node.id) : undefined
            const dimmed = focus ? !focus.has(node.id) : false
            const r = NODE_RADIUS[node.family] + (isSelected ? 4 : 0)
            const label = labelOf(node)
            // Rings share spokes, so the numeral goes beside the node (clockwise), not outward.
            const tx = -Math.sin(node.angle)
            const ty = Math.cos(node.angle)
            const numeralAnchor = tx > 0.35 ? "start" : tx < -0.35 ? "end" : "middle"
            const numeralOffset =
              numeralAnchor === "middle"
                ? { x: 0, y: Math.sign(ty) * (r + 7) + 3.5 }
                : { x: Math.sign(tx) * (r + 3), y: ty * r * 0.5 + 3.5 }
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                opacity={dimmed ? 0.28 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${label}${degree ? `, ${degree.numeral}, ${functionLabel(degree.function, degree.role)}` : ", fuera de la tonalidad"}`}
                aria-pressed={isSelected}
                aria-expanded={pinned === node.id}
                onClick={() => setPinned(current => (current === node.id ? null : node.id))}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setPinned(current => (current === node.id ? null : node.id))
                  }
                }}
                onMouseEnter={() => setHovered(node.id)}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[#f2c14e]"
                style={{ transition: "opacity 160ms" }}
              >
                {isSelected ? <circle r={r + 6} fill="none" stroke="#1f1b16" strokeWidth={2} strokeDasharray="3 3" /> : null}
                {pinned === node.id && !isSelected ? <circle r={r + 6} fill="none" stroke="#f2c14e" strokeWidth={3} /> : null}
                <circle r={r} fill={fill} stroke={inKey ? "#fffdf8" : "#cfc5b3"} strokeWidth={isSelected ? 3 : 1.5} />
                <text
                  textAnchor="middle"
                  y={4}
                  fontSize={label.length > 3 ? 9 : node.family === "diminished" || node.family === "augmented" ? 10 : 12}
                  fontWeight={700}
                  fill={inKey ? "#fffdf8" : "#1f1b16"}
                  fontFamily="var(--font-mono)"
                  pointerEvents="none"
                >
                  {label}
                </text>
                {inKey && node.family !== "augmented" ? (
                  <text
                    x={numeralOffset.x}
                    y={numeralOffset.y}
                    textAnchor={numeralAnchor}
                    fontSize={10}
                    fontWeight={600}
                    fill={functionColor(degree.function, degree.role)}
                    fontFamily="var(--font-display)"
                    pointerEvents="none"
                  >
                    {degree.numeral}
                  </text>
                ) : null}
                {steps ? (
                  <g transform={`translate(${r * 0.75},${-r * 0.75})`} pointerEvents="none">
                    <circle r={steps.length > 1 ? 9 : 7} fill="#1f1b16" stroke="#f2c14e" strokeWidth={1.5} />
                    <text textAnchor="middle" y={3} fontSize={steps.length > 1 ? 7 : 8} fontWeight={700} fill="#fbf7ef">{steps.slice(0, 2).join("·")}</text>
                  </g>
                ) : null}
              </g>
            )
          })}
        </svg>

        {cardNode ? (
          <NodeCard
            node={cardNode}
            path={cardPath}
            source={selected}
            isSource={cardNode.id === selectedNode?.id}
            pathCount={paths.length}
            actions={
              pinned === cardNode.id
                ? {
                    // Offer the node's own chord and, when the engine ranked an extension higher, that variant.
                    options: Array.from(new Set([cardNode.id === selectedNode?.id ? selected : cardNode.id, cardPath?.connection.target ?? cardNode.id])),
                    source: selected,
                    progression,
                    playingId,
                    onPreview,
                    onStopPreview,
                    onAdd,
                    onExplore: chord => {
                      onSelect(chord)
                      setPinned(null)
                    },
                    onClose: () => setPinned(null),
                  }
                : null
            }
          />
        ) : null}
      </div>

      <Legend keyLabel={key.label} mode={key.mode} parallelLabel={`${key.label.split(" ")[0]} ${key.mode === "major" ? "menor" : "mayor"}`} />
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-8 rounded-full border px-3 font-semibold transition ${on ? "border-ink bg-ink text-canvas" : "border-hairline bg-canvas text-ink-mute hover:border-ink/40"}`}
    >
      {children}
    </button>
  )
}

type CardActions = {
  options: string[]
  source: string
  progression: string[]
  playingId: string | null
  onPreview: (chordIds: string[], id: string) => void
  onStopPreview: () => void
  onAdd: (chord: string) => void
  onExplore: (chord: string) => void
  onClose: () => void
}

type CardProps = { node: MandalaNode; path: { connection: Path } | null; source: string; isSource: boolean; pathCount: number; actions: CardActions | null }

function NodeCard({ node, path, source, isSource, pathCount, actions }: CardProps) {
  const degree = node.degree
  // The key always sits on top, so the card goes in a bottom corner, opposite the node
  // (on phones it flows below the mandala instead of covering it).
  const left = node.x > MANDALA_CENTER ? "4%" : "auto"
  const right = node.x > MANDALA_CENTER ? "auto" : "4%"
  return (
    <div
      role={actions ? "dialog" : "status"}
      aria-label={actions ? `Opciones para ${node.id}` : undefined}
      className={`rounded-lg border bg-canvas/95 p-3 text-xs text-ink shadow-card backdrop-blur max-sm:mt-2 max-sm:w-full sm:absolute sm:bottom-[3%] ${actions ? "border-ink/30 sm:w-64" : "pointer-events-none border-hairline sm:w-56"}`}
      style={{ left, right }}
    >
      <p className="flex items-baseline justify-between gap-2">
        <strong className="font-mono text-base">{node.id}</strong>
        <span className="flex items-baseline gap-2">
          {degree ? <span className="font-display text-lg" style={{ color: functionColor(degree.function, degree.role) }}>{degree.numeral}</span> : null}
          {actions ? (
            <button type="button" onClick={actions.onClose} aria-label="Cerrar" className="-mr-1 h-7 w-7 rounded-full text-base text-ink-mute hover:bg-canvas-soft hover:text-ink">×</button>
          ) : null}
        </span>
      </p>
      <p className="mt-0.5 font-semibold" style={{ color: degree ? functionColor(degree.function, degree.role) : "#6b645a" }}>
        {degree ? functionLabel(degree.function, degree.role) : "Fuera de la tonalidad"}
      </p>
      {isSource ? (
        <p className="mt-2 text-ink-mute">Acorde actual. Las flechas muestran {pathCount} caminos para seguir.</p>
      ) : path ? (
        <div className="mt-2 border-t border-hairline pt-2">
          <p>
            Desde <span className="font-mono">{source}</span>:{" "}
            <strong style={{ color: categoryColor(path.connection.category) }}>{connectionLabel(path.connection.category)}</strong>{" "}
            <span className="font-mono text-ink-mute">{path.connection.score}</span>
          </p>
          {path.connection.explanation ? <p className="mt-1 leading-4 text-ink-mute">{path.connection.explanation}</p> : null}
          {path.connection.target !== node.id ? <p className="mt-1 text-ink-mute">Mejor variante: <span className="font-mono">{path.connection.target}</span></p> : null}
        </div>
      ) : (
        <p className="mt-2 text-ink-mute">{actions ? "No está entre los caminos sugeridos, pero puedes probarlo." : "Clic para escucharlo y decidir."}</p>
      )}
      {actions ? <Audition key={node.id} {...actions} isSource={isSource} /> : null}
    </div>
  )
}

/** Listen to a candidate alone, after the current chord and at the end of the progression, then decide. */
function Audition({ options, source, progression, playingId, onPreview, onStopPreview, onAdd, onExplore, isSource }: CardActions & { isSource: boolean }) {
  const [chord, setChord] = useState(options[0])
  const [added, setAdded] = useState<number | null>(null)

  const tail = progression.slice(-3)
  const listens = [
    { id: `mandala:solo:${chord}`, label: `▶ ${chord}`, chords: [chord] },
    ...(!isSource && source !== chord ? [{ id: `mandala:from:${chord}`, label: `▶ ${source} → ${chord}`, chords: [source, chord] }] : []),
    ...(tail.length ? [{ id: `mandala:tail:${chord}`, label: `▶ Tu progresión + ${chord}`, chords: [...tail, chord] }] : []),
  ]

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      {options.length > 1 ? (
        <div role="radiogroup" aria-label="Versión del acorde" className="mb-2 flex gap-1">
          {options.map(option => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={chord === option}
              onClick={() => setChord(option)}
              className={`min-h-8 rounded-md border px-2 font-mono font-semibold ${chord === option ? "border-ink bg-ink text-canvas" : "border-hairline hover:border-ink/40"}`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <p className="font-semibold uppercase tracking-[0.14em] text-ink-mute">Escúchalo antes</p>
      <div className="mt-1.5 flex flex-col gap-1">
        {listens.map(listen => {
          const playing = playingId === listen.id
          return (
            <button
              key={listen.id}
              type="button"
              onClick={() => (playing ? onStopPreview() : onPreview(listen.chords, listen.id))}
              className={`min-h-9 rounded-md border px-2 text-left font-mono font-semibold ${playing ? "border-ink bg-surface-violet-soft/40" : "border-hairline hover:border-ink"}`}
            >
              {playing ? `■ ${listen.label.slice(2)}` : listen.label}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            onAdd(chord)
            setAdded(progression.length + 1)
          }}
          className="min-h-9 flex-1 rounded-md bg-primary px-2 font-bold text-on-primary hover:bg-primary-deep"
        >
          Agregar
        </button>
        {!isSource ? (
          <button type="button" onClick={() => onExplore(chord)} className="min-h-9 flex-1 rounded-md border border-hairline px-2 font-semibold hover:border-ink">
            Explorar desde aquí
          </button>
        ) : null}
      </div>
      {added ? <p role="status" className="mt-1.5 text-fn-tonic">✓ {chord} agregado como acorde {added}.</p> : null}
    </div>
  )
}

function Legend({ keyLabel, mode, parallelLabel }: { keyLabel: string; mode: "major" | "minor"; parallelLabel: string }) {
  const functions = [
    { label: "Tónica", color: functionColor("T") },
    { label: "Subdominante", color: functionColor("SD") },
    { label: "Dominante", color: functionColor("D") },
    { label: "Prestado", color: functionColor(null, "borrowed") },
  ]
  return (
    <div className="grid gap-3 rounded-md border border-hairline bg-canvas p-3 text-xs text-ink-mute sm:grid-cols-3">
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-ink">Cómo leerlo</p>
        <p className="mt-1 leading-5">
          Pétalo dorado: <strong className="text-ink">{keyLabel}</strong>{" "}
          {mode === "major" ? "(IV · I · V arriba, ii · vi · iii debajo, vii° al centro)" : "(VI · III · VII arriba, iv · i · v debajo, ii° al centro)"}. Pétalo violeta: préstamos de {parallelLabel}
          {mode === "minor" ? ", donde también orbita el V7 que resuelve a la tónica" : ""}. Cada 7 orbita junto al acorde al que resuelve.
        </p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-ink">Función en la tonalidad</p>
        <ul className="mt-1 grid grid-cols-2 gap-1">
          {functions.map(item => (
            <li key={item.label}><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: item.color }} />{item.label}</li>
          ))}
          <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-[#cfc5b3] bg-canvas align-middle" />Fuera</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-ink">Caminos e hilo</p>
        <ul className="mt-1 grid grid-cols-2 gap-1">
          {CATEGORIES.map(category => (
            <li key={category}><span className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ backgroundColor: categoryColor(category) }} />{connectionLabel(category)}</li>
          ))}
          <li className="col-span-2"><span className="mr-1 inline-block h-1.5 w-4 rounded-full bg-surface-violet-soft align-middle" />Tu progresión, numerada</li>
        </ul>
      </div>
    </div>
  )
}
