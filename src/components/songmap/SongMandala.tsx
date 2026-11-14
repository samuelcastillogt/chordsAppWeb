"use client"

import { useMemo } from "react"

import {
  Key,
  MANDALA_CENTER,
  MANDALA_SIZE,
  MandalaFamily,
  MandalaNode,
  NODE_RADIUS,
  RING_RADIUS,
  buildMandala,
  curvePath,
  keySpoke,
  parallelSpoke,
  petalPath,
} from "@/lib/music/mandala"
import { NodeUse, SongStep, Transition, spellChord, usedRadius } from "@/lib/music/songmap"
import { functionColor } from "@/lib/music/theory"

type Props = {
  songKey: Key
  /** Keys of sections that modulate, drawn as extra petals. */
  modulations: Key[]
  usage: Map<string, NodeUse>
  transitions: Transition[]
  /** Section to highlight; null shows the whole song. */
  section: number | null
  /** The step sounding during playback (and the one before it, to light the move). */
  playing: { step: SongStep; previous: SongStep | null } | null
  selectedNode: string | null
  onSelectNode: (node: string | null) => void
}

const BASE_FAMILIES: MandalaFamily[] = ["dominant", "major", "minor", "diminished"]
const VIEW_PAD = 30
const MODULATION_COLOR = "#1c5a52"
const OUTSIDE_COLOR = "#6b7280"

const colorOf = (node: MandalaNode | undefined) => (node?.degree ? functionColor(node.degree.function, node.degree.role) : OUTSIDE_COLOR)
const markerId = (color: string) => `song-arrow-${color.slice(1)}`

/**
 * The song's harmonic fingerprint on the mandala: each chord grows with how much it sounds, each
 * arrow is a move the song makes (thicker when it repeats), and unused chords stay as faint dots
 * so the shape of the song stands out against the whole harmonic space.
 */
export default function SongMandala({ songKey, modulations, usage, transitions, section, playing, selectedNode, onSelectNode }: Props) {
  const families = useMemo(
    () => (Array.from(usage.keys()).some(node => node.endsWith("+")) ? [...BASE_FAMILIES, "augmented" as const] : BASE_FAMILIES),
    [usage],
  )
  const nodes = useMemo(() => buildMandala(songKey, families), [songKey, families])
  const nodeById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])

  const maxUse = Math.max(1, ...Array.from(usage.values()).map(use => use.count))
  const maxMove = Math.max(1, ...transitions.map(move => move.count))
  const pairs = new Set(transitions.map(move => `${move.from}>${move.to}`))
  const inSection = (sections: number[]) => section === null || sections.includes(section)
  const radiusOf = (node: MandalaNode) => {
    const use = usage.get(node.id)
    return use ? usedRadius(use.count, maxUse, NODE_RADIUS[node.family] + 2) : 4
  }
  const colors = Array.from(new Set([...nodes.map(node => colorOf(node)), OUTSIDE_COLOR]))
  const neighbours = selectedNode
    ? new Set(transitions.filter(move => move.from === selectedNode || move.to === selectedNode).flatMap(move => [move.from, move.to]))
    : null

  return (
    <svg
      viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${MANDALA_SIZE + VIEW_PAD * 2} ${MANDALA_SIZE + VIEW_PAD * 2}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label={`Mapa armónico de la canción en ${songKey.label}`}
      onClick={event => event.target === event.currentTarget && onSelectNode(null)}
    >
      <defs>
        {colors.map(color => (
          <marker key={color} id={markerId(color)} viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,-4.5L9,0L0,4.5Z" fill={color} />
          </marker>
        ))}
      </defs>

      <path d={petalPath(keySpoke(songKey), songKey)} fill="#f2c14e" fillOpacity={0.16} stroke="#f2c14e" strokeOpacity={0.5} />
      <path d={petalPath(parallelSpoke(songKey), songKey)} fill="#7b5cd6" fillOpacity={0.06} stroke="#7b5cd6" strokeOpacity={0.25} strokeDasharray="4 6" />
      {modulations.map(key => (
        <path
          key={key.label}
          d={petalPath(keySpoke(key), songKey)}
          fill={MODULATION_COLOR}
          fillOpacity={0.08}
          stroke={MODULATION_COLOR}
          strokeOpacity={0.5}
          strokeDasharray="6 4"
        />
      ))}
      <g fill="none" stroke="#e7dfd0">
        {families.map(family => (
          <circle key={family} cx={MANDALA_CENTER} cy={MANDALA_CENTER} r={RING_RADIUS[family]} strokeDasharray={family === "major" ? undefined : "2 6"} />
        ))}
      </g>
      {!families.includes("augmented") ? (
        <text x={MANDALA_CENTER} y={MANDALA_CENTER + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill="#6b645a" fontFamily="var(--font-display)">
          {songKey.label}
        </text>
      ) : null}

      {/* Moves of the song: width = how often, colour = function of the chord it lands on. */}
      <g fill="none" strokeLinecap="round">
        {transitions.map(move => {
          const from = nodeById.get(move.from)
          const to = nodeById.get(move.to)
          if (!from || !to) return null
          // A move that also happens backwards bows less, so both arrows stay visible.
          const bend = pairs.has(`${move.to}>${move.from}`) && move.from > move.to ? 0.12 : 0.34
          const color = colorOf(to)
          const strength = move.count / maxMove
          const visible =
            inSection(move.sections) &&
            (!neighbours || (neighbours.has(move.from) && neighbours.has(move.to) && (move.from === selectedNode || move.to === selectedNode)))
          return (
            <path
              key={`${move.from}>${move.to}`}
              d={curvePath(from, to, bend, radiusOf(from) + 2, radiusOf(to) + 5)}
              stroke={color}
              strokeWidth={1.2 + strength * 7}
              strokeOpacity={visible ? 0.3 + strength * 0.55 : 0.06}
              markerEnd={`url(#${markerId(color)})`}
            >
              <title>{`${move.from} → ${move.to}: ${move.count} ${move.count === 1 ? "vez" : "veces"}`}</title>
            </path>
          )
        })}
        {playing?.previous && playing.previous.node !== playing.step.node
          ? (() => {
              const from = nodeById.get(playing.previous.node)
              const to = nodeById.get(playing.step.node)
              return from && to ? (
                <path d={curvePath(from, to, 0.34, radiusOf(from) + 2, radiusOf(to) + 2)} stroke="#f2c14e" strokeWidth={6} strokeOpacity={0.95} />
              ) : null
            })()
          : null}
      </g>

      {nodes.map(node => {
        const use = usage.get(node.id)
        const r = radiusOf(node)
        const color = colorOf(node)
        if (!use) return <circle key={node.id} cx={node.x} cy={node.y} r={r} fill="#fffdf8" stroke="#d8cfbf" />
        const active = inSection(use.sections) && (!neighbours || neighbours.has(node.id))
        const isPlaying = playing?.step.node === node.id
        const label = spellChord(use.chords.length === 1 ? use.chords[0] : node.id, songKey)
        return (
          <g
            key={node.id}
            transform={`translate(${node.x},${node.y})`}
            opacity={active ? 1 : 0.22}
            role="button"
            tabIndex={0}
            aria-pressed={selectedNode === node.id}
            aria-label={`${label}: ${use.count} ${use.count === 1 ? "vez" : "veces"}${node.degree ? `, ${node.degree.numeral}` : ", fuera de la tonalidad"}`}
            onClick={() => onSelectNode(selectedNode === node.id ? null : node.id)}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelectNode(selectedNode === node.id ? null : node.id)
              }
            }}
            className="cursor-pointer outline-none"
            style={{ transition: "opacity 200ms" }}
          >
            {isPlaying ? <circle r={r + 9} fill="none" stroke="#f2c14e" strokeWidth={4} className="animate-pulse" /> : null}
            {selectedNode === node.id ? <circle r={r + 5} fill="none" stroke="#1f1b16" strokeWidth={2} strokeDasharray="3 3" /> : null}
            <circle r={r} fill={color} stroke="#fffdf8" strokeWidth={2} />
            <text
              textAnchor="middle"
              y={4}
              fontSize={label.length > 3 ? 10 : 12}
              fontWeight={700}
              fill="#fffdf8"
              fontFamily="var(--font-mono)"
              pointerEvents="none"
            >
              {label}
            </text>
            {node.degree ? <Numeral node={node} r={r} color={color} /> : null}
          </g>
        )
      })}
    </svg>
  )
}

/** Degree beside the node, clockwise: rings share spokes, so above or below would hit the next ring. */
function Numeral({ node, r, color }: { node: MandalaNode; r: number; color: string }) {
  const tx = -Math.sin(node.angle)
  const ty = Math.cos(node.angle)
  const anchor = tx > 0.35 ? "start" : tx < -0.35 ? "end" : "middle"
  const offset = anchor === "middle" ? { x: 0, y: Math.sign(ty) * (r + 8) + 3.5 } : { x: Math.sign(tx) * (r + 3), y: ty * r * 0.5 + 3.5 }
  return (
    <text x={offset.x} y={offset.y} textAnchor={anchor} fontSize={10} fontWeight={600} fill={color} fontFamily="var(--font-display)" pointerEvents="none">
      {node.degree?.numeral}
    </text>
  )
}
