import { categoryColor, connectionLabel, getIntervalName } from "@/lib/music/theory"
import { Chord, Connection } from "@/types"

type CompatibleChord = {
  chord: Chord
  matchedNotes: string[]
  coverage: number
}

type InstrumentRecommendationsProps = {
  pressedNotes: string[]
  compatibleChords: CompatibleChord[]
  selectedChord: Chord | null
  connections: Connection[]
  isLoadingConnections: boolean
  onSelectChord: (chordId: string) => void
  onClear: () => void
}

export default function InstrumentRecommendations({
  pressedNotes,
  compatibleChords,
  selectedChord,
  connections,
  isLoadingConnections,
  onSelectChord,
  onClear,
}: InstrumentRecommendationsProps) {
  return (
    <aside className="rounded-lg border border-hairline bg-canvas p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Compatibilidad</p>
          <h2 className="mt-2 text-[28px] font-[540] leading-[1.14] tracking-[-0.63px] text-ink">Siguiente acorde</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="min-h-10 rounded-md border border-hairline-dark px-3 text-xs font-bold text-ink hover:bg-canvas-soft"
        >
          Limpiar
        </button>
      </div>

      <div className="mt-5 rounded-md bg-canvas-soft p-4">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-mute">Notas presionadas</span>
        <div className="mt-3 flex min-h-10 flex-wrap gap-2">
          {pressedNotes.length === 0 ? (
            <span className="text-sm text-ink-mute">Presiona una cuerda o tecla para empezar.</span>
          ) : (
            pressedNotes.map(note => (
              <span key={note} className="rounded-full bg-primary px-3 py-2 text-sm font-bold text-on-primary">
                {note}
              </span>
            ))
          )}
        </div>
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-bold text-ink">Acordes compatibles</h3>
        <p className="mt-1 text-xs leading-5 text-ink-mute">Un acorde es compatible si contiene todas las notas que estas presionando.</p>
        <ul className="mt-3 max-h-[280px] space-y-2 overflow-auto pr-1">
          {compatibleChords.length === 0 && (
            <li className="rounded-md border border-hairline bg-canvas-soft p-4 text-sm text-ink-mute">No hay acordes compatibles todavia.</li>
          )}
          {compatibleChords.map(match => (
            <li key={match.chord.id}>
              <button
                type="button"
                onClick={() => onSelectChord(match.chord.id)}
                className={`w-full rounded-md border p-3 text-left transition hover:border-hairline-dark ${selectedChord?.id === match.chord.id ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas-soft text-ink"}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <strong className="text-lg">{match.chord.id}</strong>
                  <span className="text-xs font-bold">{Math.round(match.coverage * 100)}%</span>
                </span>
                <span className={`mt-1 block text-xs ${selectedChord?.id === match.chord.id ? "text-on-dark-mute" : "text-ink-mute"}`}>
                  {match.matchedNotes.map(note => `${note} (${getIntervalName(match.chord.root, note)})`).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-bold text-ink">Mejores movimientos</h3>
        <p className="mt-1 text-xs leading-5 text-ink-mute">Se calculan desde el acorde compatible seleccionado usando el motor de conexiones.</p>
        <ul className="mt-3 space-y-2">
          {isLoadingConnections && <li className="rounded-md bg-canvas-soft p-4 text-sm text-ink-mute">Calculando recomendaciones...</li>}
          {!isLoadingConnections && !selectedChord && (
            <li className="rounded-md bg-canvas-soft p-4 text-sm text-ink-mute">Elige un acorde compatible para ver hacia donde moverte.</li>
          )}
          {!isLoadingConnections &&
            selectedChord &&
            connections.slice(0, 8).map(connection => (
              <li key={connection.target} className="rounded-md border border-hairline bg-canvas-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>
                    {selectedChord.id} -&gt; {connection.target}
                  </strong>
                  <span className="font-mono font-bold" style={{ color: categoryColor(connection.category) }}>
                    {connection.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-mute">{connectionLabel(connection.category)}</p>
              </li>
            ))}
        </ul>
      </section>
    </aside>
  )
}
