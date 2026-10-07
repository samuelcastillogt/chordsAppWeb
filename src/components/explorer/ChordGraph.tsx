"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { categoryColor, connectionLabel, getCircleAngle, getCircleDistance, getChordRoot, getIntervalName } from "@/lib/music/theory"
import { Chord, Connection } from "@/types"

interface Props {
  sourceChord: Chord | null
  connections: Connection[]
  chords: Chord[]
  onSelectChord?: (chord: string) => void
}

/** Options map: the selected chord in the centre, its connections placed by circle-of-fifths distance. */
export default function ChordGraph({ sourceChord, connections, chords, onSelectChord }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    if (!sourceChord || chords.length === 0) return

    const width = 600
    const height = 600
    const centerX = width / 2
    const centerY = height / 2
    const outerRadius = 250
    const visibleIds = new Set([sourceChord.id, ...connections.map(c => c.target)])
    const visibleChords = chords.filter(chord => visibleIds.has(chord.id))

    const nodes = visibleChords.map(chord => {
      const radius = outerRadius - Math.min(getCircleDistance(sourceChord.circlePosition, chord.circlePosition), 4) * 34
      const angle = getCircleAngle(chord.circlePosition)
      const isSource = chord.id === sourceChord.id
      return {
        id: chord.id,
        x: isSource ? centerX : centerX + radius * Math.cos(angle),
        y: isSource ? centerY : centerY + radius * Math.sin(angle),
      }
    })

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const baseNote = getChordRoot(sourceChord.id)

    function buildTooltipText(chordId: string) {
      const targetNote = getChordRoot(chordId)
      const interval = getIntervalName(baseNote, targetNote)
      const conn = connections.find(c => c.target === chordId)
      const score = conn ? ` · ${conn.score} (${connectionLabel(conn.category)})` : ""
      return `Base ${baseNote} -> ${targetNote}: ${interval}${score}`
    }

    svg
      .selectAll(".link")
      .data(connections.filter(connection => nodeMap.has(connection.target)))
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", centerX)
      .attr("y1", centerY)
      .attr("x2", d => nodeMap.get(d.target)!.x)
      .attr("y2", d => nodeMap.get(d.target)!.y)
      .attr("stroke", d => categoryColor(d.category))
      .attr("stroke-width", d => Math.max(1.4, d.score / 26))
      .attr("stroke-opacity", 0.6)

    svg
      .selectAll(".node")
      .data(nodes.map(node => node.id))
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("cx", d => nodeMap.get(d)?.x ?? 0)
      .attr("cy", d => nodeMap.get(d)?.y ?? 0)
      .attr("r", d => (d === sourceChord.id ? 20 : 14))
      .attr("fill", d => {
        if (d === sourceChord.id) return "#16132a"
        const conn = connections.find(c => c.target === d)
        return conn ? categoryColor(conn.category) : "#c9b4fa"
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => `Seleccionar acorde ${d}`)
      .style("cursor", "pointer")
      .on("click", (_, d) => onSelectChord?.(d))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelectChord?.(d)
        }
      })
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", d === sourceChord.id ? 24 : 18)
        setTooltip({ x: event.offsetX, y: event.offsetY, text: buildTooltipText(d) })
      })
      .on("mouseleave", function (_, d) {
        d3.select(this).attr("r", d === sourceChord.id ? 20 : 14)
        setTooltip(null)
      })

    svg
      .selectAll(".node-label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("x", d => (d.id === sourceChord.id ? d.x : d.x + 16))
      .attr("y", d => (d.id === sourceChord.id ? d.y - 30 : d.y + 5))
      .attr("text-anchor", d => (d.id === sourceChord.id ? "middle" : "start"))
      .attr("fill", d => (d.id === sourceChord.id ? "#1b1938" : "#292827"))
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("paint-order", "stroke")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 5)
      .attr("stroke-linejoin", "round")
      .style("pointer-events", "none")
      .text(d => (d.id === sourceChord.id ? `${d.id} base` : d.id))
  }, [sourceChord, connections, chords, onSelectChord])

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox="0 0 600 600" className="h-auto w-full" role="img" aria-label="Mapa visual de conexiones armonicas" />
      {tooltip && (
        <div
          className="pointer-events-none absolute max-w-56 rounded-md border border-hairline bg-canvas px-3 py-2 text-xs text-ink shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
