import { categoryColor, connectionLabel } from "@/lib/music/theory"
import { TensionPoint } from "@/types"

/** Line chart of how smooth (high) or tense (low) each chord change is. */
export default function TensionCurve({ points, chords }: { points: TensionPoint[]; chords: string[] }) {
  if (!points.length) return null
  const width = 640
  const height = 200
  const padX = 36
  const padY = 24
  const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0
  const x = (index: number) => (points.length > 1 ? padX + index * step : width / 2)
  const y = (score: number) => padY + (1 - score / 100) * (height - padY * 2)
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.score)}`).join(" ")

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Curva de fluidez entre acordes">
        {[0, 50, 100].map(level => (
          <g key={level}>
            <line x1={padX} x2={width - padX} y1={y(level)} y2={y(level)} stroke="#e7dfd0" strokeDasharray={level === 50 ? "4 6" : ""} />
            <text x={4} y={y(level) + 4} fontSize="11" fill="#a39b8e">
              {level}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#1f1b16" strokeWidth="2" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.from}-${point.to}-${index}`}>
            <circle cx={x(index)} cy={y(point.score)} r="7" fill={categoryColor(point.category)} stroke="#fffdf8" strokeWidth="2">
              <title>{`${point.from} → ${point.to}: ${point.score} (${connectionLabel(point.category)})`}</title>
            </circle>
            <text x={x(index)} y={height - 4} textAnchor="middle" fontSize="11" fill="#6b645a" fontFamily="var(--font-mono)">
              {`${chords[index] ?? point.from}→${chords[index + 1] ?? point.to}`}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-xs text-ink-mute">Más alto = cambio más fluido. Los puntos rojos marcan los saltos con más tensión.</figcaption>
    </figure>
  )
}
