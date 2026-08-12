"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { categoryColor, chordFamilyColor, connectionLabel, getChordRing, getCircleAngle, getCircleDistance, getChordRoot, getIntervalName } from "@/lib/music"
import { Chord, Connection } from "@/types"

interface Props {
  sourceChord: Chord | null
  connections: Connection[]
  chords: Chord[]
  mode?: "connections" | "mandala"
  onSelectChord?: (chord: string) => void
}

export default function ChordGraph({ sourceChord, connections, chords, mode = "connections", onSelectChord }: Props) {
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
    const ringStep = 28
    const visibleIds = new Set(mode === "mandala" ? chords.map(chord => chord.id) : [sourceChord.id, ...connections.map(c => c.target)])
    const visibleChords = chords.filter(chord => visibleIds.has(chord.id))

    const nodes = visibleChords.map(chord => {
      const ring = getChordRing(chord.type)
      const radius = mode === "mandala" ? outerRadius - ring * ringStep : outerRadius - Math.min(getCircleDistance(sourceChord.circlePosition, chord.circlePosition), 4) * 34
      const angle = getCircleAngle(chord.circlePosition) + (mode === "mandala" ? ring * 0.035 : 0)
      return {
        id: chord.id,
        chord,
        ring,
        x: chord.id === sourceChord.id && mode === "connections" ? centerX : centerX + radius * Math.cos(angle),
        y: chord.id === sourceChord.id && mode === "connections" ? centerY : centerY + radius * Math.sin(angle),
      }
    })

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const chordMap = new Map(chords.map(chord => [chord.id, chord]))
    const baseNote = getChordRoot(sourceChord.id)

    const arrowFamilies = [
      { id: "major", color: chordFamilyColor("major") },
      { id: "minor", color: chordFamilyColor("minor") },
      { id: "dim", color: chordFamilyColor("dim") },
      { id: "dom7", color: chordFamilyColor("dom7") },
      { id: "aug", color: chordFamilyColor("aug") },
      { id: "fallback", color: chordFamilyColor("fallback") },
    ]

    const defs = svg.append("defs")
    arrowFamilies.forEach(family => {
      defs.append("marker")
        .attr("id", `arrow-${family.id}`)
        .attr("viewBox", "0 -7 14 14")
        .attr("refX", 12)
        .attr("refY", 0)
        .attr("markerWidth", 11)
        .attr("markerHeight", 11)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M1,-6L13,0L1,6Z")
        .attr("fill", family.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5)
    })

    function markerId(type: string) {
      if (type === "dim7") return "arrow-dim"
      if (type === "major" || type === "minor" || type === "dim" || type === "dom7" || type === "aug") return `arrow-${type}`
      return "arrow-fallback"
    }

    function isRelativePair(a: Chord, b: Chord) {
      const major = a.type === "major" ? a : b.type === "major" ? b : null
      const minor = a.type === "minor" ? a : b.type === "minor" ? b : null
      if (!major || !minor) return false
      return minor.circlePosition === (major.circlePosition - 3 + 12) % 12
    }

    function isParallelPair(a: Chord, b: Chord) {
      return a.root === b.root && a.type !== b.type
    }

    function isBidirectionalPair(a: Chord, b: Chord) {
      if (isRelativePair(a, b) || isParallelPair(a, b)) return true
      return a.type === b.type && getCircleDistance(a.circlePosition, b.circlePosition) <= 1
    }

    function drawOffsetLine(a: { x: number; y: number }, b: { x: number; y: number }, offset: number, color: string) {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const length = Math.hypot(dx, dy) || 1
      const ox = (-dy / length) * offset
      const oy = (dx / length) * offset
      svg.append("line")
        .attr("x1", a.x + ox)
        .attr("y1", a.y + oy)
        .attr("x2", b.x + ox)
        .attr("y2", b.y + oy)
        .attr("stroke", color)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 1.2)
    }

    function visibleEndpoint(from: { x: number; y: number }, to: { x: number; y: number }, padding: number) {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.hypot(dx, dy) || 1
      return {
        x: to.x - (dx / length) * padding,
        y: to.y - (dy / length) * padding,
      }
    }

    function buildTooltipText(chordId: string) {
      const targetNote = getChordRoot(chordId)
      const interval = getIntervalName(baseNote, targetNote)
      const conn = connections.find(c => c.target === chordId)
      const score = conn ? ` · ${conn.score} (${connectionLabel(conn.category)})` : ""
      return `Base ${baseNote} -> ${targetNote}: ${interval}${score}`
    }

    if (mode === "mandala") {
      const rings = ["major", "minor", "dom7", "dim", "aug", "dim7"]
      rings.forEach(type => {
        svg.append("circle")
          .attr("cx", centerX)
          .attr("cy", centerY)
          .attr("r", outerRadius - getChordRing(type) * ringStep)
          .attr("fill", "none")
          .attr("stroke", type === "major" ? "#3f3a52" : "#e8e4dd")
          .attr("stroke-dasharray", type === "major" ? "" : "4 8")
          .attr("stroke-width", 1)
      })

      const majorNodes = nodes.filter(node => node.chord.type === "major").sort((a, b) => a.chord.circlePosition - b.chord.circlePosition)
      majorNodes.forEach((node, index) => {
        const next = majorNodes[(index + 1) % majorNodes.length]
        svg.append("line")
          .attr("x1", node.x)
          .attr("y1", node.y)
          .attr("x2", next.x)
          .attr("y2", next.y)
          .attr("stroke", chordFamilyColor("major"))
          .attr("stroke-opacity", 0.55)
      })

      chords.filter(chord => chord.type === "major").forEach(major => {
        const minor = chords.find(chord => chord.type === "minor" && chord.root === major.root)
        const majorNode = nodeMap.get(major.id)
        const minorNode = minor ? nodeMap.get(minor.id) : undefined
        if (majorNode && minorNode) {
          drawOffsetLine(majorNode, minorNode, -3, chordFamilyColor("minor"))
          drawOffsetLine(majorNode, minorNode, 3, chordFamilyColor("major"))
        }
      })

      chords.filter(chord => chord.type === "major").forEach(major => {
        const relativeMinorPosition = (major.circlePosition - 3 + 12) % 12
        const relativeMinor = chords.find(chord => chord.type === "minor" && chord.circlePosition === relativeMinorPosition)
        const majorNode = nodeMap.get(major.id)
        const minorNode = relativeMinor ? nodeMap.get(relativeMinor.id) : undefined
        if (majorNode && minorNode) {
          svg.append("line")
            .attr("x1", majorNode.x)
            .attr("y1", majorNode.y)
            .attr("x2", minorNode.x)
            .attr("y2", minorNode.y)
            .attr("stroke", chordFamilyColor("minor"))
            .attr("stroke-dasharray", "3 7")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1.2)
        }
      })
    }

    const sourceNode = mode === "mandala" ? nodeMap.get(sourceChord.id) : { x: centerX, y: centerY }

    svg
      .selectAll(".link")
      .data(connections)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => {
        const target = nodeMap.get(d.target)
        if (mode !== "mandala" || !sourceNode || !target) return sourceNode?.x ?? centerX
        return visibleEndpoint(target, sourceNode, 26).x
      })
      .attr("y1", d => {
        const target = nodeMap.get(d.target)
        if (mode !== "mandala" || !sourceNode || !target) return sourceNode?.y ?? centerY
        return visibleEndpoint(target, sourceNode, 26).y
      })
      .attr("x2", d => {
        const target = nodeMap.get(d.target)
        if (mode !== "mandala" || !sourceNode || !target) return target?.x ?? centerX
        return visibleEndpoint(sourceNode, target, 22).x
      })
      .attr("y2", d => {
        const target = nodeMap.get(d.target)
        if (mode !== "mandala" || !sourceNode || !target) return target?.y ?? centerY
        return visibleEndpoint(sourceNode, target, 22).y
      })
      .attr("stroke", d => {
        const target = chordMap.get(d.target)
        return mode === "mandala" && target ? chordFamilyColor(target.type) : categoryColor(d.category)
      })
      .attr("stroke-width", d => Math.max(mode === "mandala" ? 2.2 : 1.4, d.score / 26))
      .attr("stroke-opacity", mode === "mandala" ? 0.85 : 0.6)
      .attr("marker-end", d => {
        const target = chordMap.get(d.target)
        return mode === "mandala" && target ? `url(#${markerId(target.type)})` : null
      })
      .attr("marker-start", d => {
        const target = chordMap.get(d.target)
        if (mode !== "mandala" || !target || !isBidirectionalPair(sourceChord, target)) return null
        return `url(#${markerId(sourceChord.type)})`
      })
      .attr("stroke-dasharray", d => {
        const target = chordMap.get(d.target)
        return mode === "mandala" && target && isRelativePair(sourceChord, target) ? "4 7" : null
      })

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
        const chord = chordMap.get(d)
        if (d === sourceChord.id) return chord ? chordFamilyColor(chord.type) : "#7c3aed"
        const conn = connections.find(c => c.target === d)
        if (mode === "mandala" && chord) return chordFamilyColor(chord.type)
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
      .attr("x", d => (d.id === sourceChord.id && mode === "connections" ? d.x : d.x + 16))
      .attr("y", d => (d.id === sourceChord.id && mode === "connections" ? d.y - 30 : d.y + 5))
      .attr("text-anchor", d => (d.id === sourceChord.id && mode === "connections" ? "middle" : "start"))
      .attr("fill", d => (d.id === sourceChord.id ? "#1b1938" : "#292827"))
      .attr("font-size", d => (mode === "mandala" && d.ring > 2 ? "9px" : "11px"))
      .attr("font-weight", "700")
      .attr("paint-order", "stroke")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 5)
      .attr("stroke-linejoin", "round")
      .style("pointer-events", "none")
      .text(d => d.id === sourceChord.id && mode === "connections" ? `${d.id} base` : d.id)
  }, [sourceChord, connections, chords, mode, onSelectChord])

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox="0 0 600 600" className="w-full h-auto" role="img" aria-label="Mapa visual de conexiones armonicas" />
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
