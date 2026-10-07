"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ChordGraph from "@/components/ChordGraph"
import ChordSelector from "@/components/ChordSelector"
import ConfirmDialog from "@/components/ConfirmDialog"
import GuitarFretboard from "@/components/GuitarFretboard"
import HarmonicMandala from "@/components/HarmonicMandala"
import PlayerControls from "@/components/PlayerControls"
import StylePicker from "@/components/StylePicker"
import SuggestionPanel from "@/components/SuggestionPanel"
import TensionCurve from "@/components/TensionCurve"
import { appUrl, del, get, getApiBaseUrl, post, put } from "@/lib/api"
import { playArpeggio } from "@/lib/audio"
import { useAuth } from "@/lib/auth"
import { downloadBlob, downloadSvg, downloadSvgAsPng, slugify } from "@/lib/export"
import { progressionToMidi } from "@/lib/midi"
import { categoryColor, connectionLabel } from "@/lib/music"
import { moveItem } from "@/lib/progression"
import { loadStyles } from "@/lib/style"
import { StylePreset, SuggestionMode, rankSuggestions } from "@/lib/suggestions"
import { pushStep, trailContext, undoStep } from "@/lib/trail"
import { usePlayer } from "@/lib/usePlayer"
import { AnalyzeResponse, Chord, ConnectionsResponse, ParsedChord, Progression, SavedStyle, StyleSuggestResponse, TablatureResponse } from "@/types"

const DEFAULT_PROGRESSION = ["C", "G7", "Am", "F"]

type ViewMode = "connections" | "mandala" | "fretboard"

function downloadTablatureText(tablature: TablatureResponse) {
  downloadBlob(new Blob([tablature.text], { type: "text/plain;charset=utf-8" }), `${slugify(tablature.title, "tablatura")}.txt`)
}

function downloadTablaturePng(tablature: TablatureResponse) {
  const lines = tablature.text.split("\n")
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return

  const font = "18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  context.font = font
  const width = Math.ceil(Math.max(...lines.map(line => context.measureText(line).width)) + 64)
  const height = lines.length * 30 + 64
  canvas.width = width
  canvas.height = height

  context.fillStyle = "#fafaf8"
  context.fillRect(0, 0, width, height)
  context.fillStyle = "#1b1938"
  context.font = font
  lines.forEach((line, index) => {
    context.fillText(line, 32, 40 + index * 30)
  })

  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, `${slugify(tablature.title, "tablatura")}.png`)
  }, "image/png")
}

export default function ExplorerPage() {
  return (
    <Suspense>
      <Explorer />
    </Suspense>
  )
}

function Explorer() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { user, accountsEnabled, openDialog } = useAuth()
  const loadedFromUrl = useRef(false)
  const [selectedChord, setSelectedChord] = useState("C")
  const [tonality, setTonality] = useState("C")
  const [progressionName, setProgressionName] = useState("Nueva progresión")
  const [progression, setProgression] = useState<string[]>(DEFAULT_PROGRESSION)
  const [mode, setMode] = useState<ViewMode>("mandala")
  const [activeNotes, setActiveNotes] = useState<string[]>([])
  const [selectedProgressionId, setSelectedProgressionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isTablatureModalOpen, setIsTablatureModalOpen] = useState(false)
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>("all")
  const [stylePreset, setStylePreset] = useState<StylePreset>("balanced")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Progression | null>(null)
  // Chords picked on the map, in order: they stay marked and give context to the suggestions.
  const [trail, setTrail] = useState<string[]>([])
  const [styles, setStyles] = useState<SavedStyle[]>([])
  const [styleId, setStyleId] = useState<string | null>(null)
  const [styleWeight, setStyleWeight] = useState(0.65)
  const graphRef = useRef<HTMLDivElement>(null)
  const curveRef = useRef<HTMLDivElement>(null)
  const player = usePlayer()

  const { data: chords = [], isLoading: chordsLoading, error: chordsError } = useQuery<Chord[]>({
    queryKey: ["chords"],
    queryFn: () => get<Chord[]>("/api/v1/chords"),
  })

  // Ask for more than we show so the intention filters still have enough options.
  const { data: connectionsData, isLoading: connectionsLoading, error: connectionsError } = useQuery<ConnectionsResponse>({
    queryKey: ["connections", selectedChord, tonality],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${selectedChord}/connections`, { tonality, min_score: 0, max_results: 60 }),
    enabled: !!selectedChord,
  })

  const activeStyle = styles.find(item => item.id === styleId) ?? null
  const styleHistory = trailContext(trail, selectedChord)
  const { data: styleData, isFetching: styleLoading, error: styleError } = useQuery<StyleSuggestResponse>({
    queryKey: ["style-suggest", styleId, styleHistory.join(","), tonality, styleWeight],
    queryFn: () => post<StyleSuggestResponse>("/api/v1/style/suggest", { profile: activeStyle?.profile, history: styleHistory, tonality, weight: styleWeight, maxResults: 60 }),
    enabled: !!activeStyle && !!selectedChord,
    placeholderData: previous => previous,
  })

  const { data: targetChord } = useQuery<Chord>({
    queryKey: ["chord", selectedChord],
    queryFn: () => get<Chord>(`/api/v1/chords/${selectedChord}`),
    enabled: !!selectedChord,
  })

  const { data: progressionsData, error: progressionsError } = useQuery<{ progressions: Progression[]; total: number }>({
    queryKey: ["progressions", user?.id],
    queryFn: () => get<{ progressions: Progression[]; total: number }>("/api/v1/progressions"),
    enabled: !!user,
  })

  // Deep links: ?chords=Bm,G,D,A&key=Bm (from the analyzer or the songbook), ?p=<shared id>, ?style=<saved style>.
  useEffect(() => {
    if (loadedFromUrl.current) return
    loadedFromUrl.current = true
    const saved = loadStyles()
    setStyles(saved)
    const styleParam = searchParams.get("style")
    if (styleParam && saved.some(item => item.id === styleParam)) setStyleId(styleParam)
    const sharedId = searchParams.get("p")
    const chordParam = searchParams.get("chords")
    const keyParam = searchParams.get("key")
    if (keyParam) setTonality(keyParam)
    if (sharedId) {
      get<Progression>(`/api/v1/progressions/${encodeURIComponent(sharedId)}`)
        .then(shared => {
          loadProgression(shared)
          if (!shared.isOwner) setSelectedProgressionId(null)
        })
        .catch(() => setErrorMessage("Esa progresión no existe o no es pública."))
    } else if (chordParam) {
      post<{ results: ParsedChord[] }>("/api/v1/chords/parse", { symbols: chordParam.split(",").filter(Boolean) })
        .then(({ results }) => {
          const ids = results.map(result => result.chord).filter((id): id is string => Boolean(id))
          if (ids.length) {
            setProgression(ids)
            setSelectedChord(ids[ids.length - 1])
            setTrail([])
            setProgressionName("Progresión importada")
          }
        })
        .catch(() => setErrorMessage("No se pudieron leer los acordes del enlace."))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const analyzeMutation = useMutation({
    mutationFn: () => post<AnalyzeResponse>("/api/v1/analyze", { chords: progression, tonality }),
    onError: error => setErrorMessage(error instanceof Error ? error.message : "No se pudo analizar la progresión"),
  })

  const shareMutation = useMutation({
    mutationFn: (saved: Progression) => put<Progression>(`/api/v1/progressions/${saved.id}`, { isPublic: true }),
    onSuccess: async saved => {
      const link = appUrl(`/explorer?p=${saved.id}`)
      try {
        await navigator.clipboard.writeText(link)
        setMessage(`Enlace copiado: ${link}`)
      } catch {
        setMessage(`Comparte este enlace: ${link}`)
      }
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
    onError: error => setErrorMessage(error instanceof Error ? error.message : "No se pudo compartir"),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = { name: progressionName.trim(), chords: progression, tonality }
      return selectedProgressionId
        ? put<Progression>(`/api/v1/progressions/${selectedProgressionId}`, body)
        : post<Progression>("/api/v1/progressions", body)
    },
    onSuccess: saved => {
      setSelectedProgressionId(saved.id)
      setMessage(`Progresión guardada: ${saved.name}`)
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
    onError: error => setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la progresión"),
  })

  const tablatureMutation = useMutation({
    mutationFn: () => post<TablatureResponse>("/api/v1/tablature", { title: progressionName.trim() || "ChordWeaver tablatura", chords: progression }),
    onSuccess: () => {
      setIsTablatureModalOpen(true)
      setErrorMessage(null)
    },
    onError: error => setErrorMessage(error instanceof Error ? error.message : "No se pudo generar la tablatura"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/api/v1/progressions/${id}`),
    onSuccess: () => {
      setSelectedProgressionId(null)
      setProgression(DEFAULT_PROGRESSION)
      setProgressionName("Nueva progresión")
      setMessage("Progresión eliminada")
      setErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ["progressions"] })
    },
    onError: error => setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar la progresión"),
  })

  /** Makes `chord` the current chord and adds it to the walk (already-picked chords stay marked). */
  const selectChord = (chord: string) => {
    setSelectedChord(chord)
    setTrail(current => pushStep(current, chord))
  }

  const addChordToProgression = (chord: string) => {
    analyzeMutation.reset()
    tablatureMutation.reset()
    setProgression(current => [...current, chord])
    selectChord(chord)
    setMessage(`${chord} agregado a tu progresión`)
  }

  const addChordsToProgression = (chordIds: string[]) => {
    if (!chordIds.length) return
    resetResults()
    setProgression(current => [...current, ...chordIds])
    chordIds.forEach(selectChord)
    setMessage(`${chordIds.join(" → ")} agregado a tu progresión`)
  }

  const trailToProgression = () => {
    resetResults()
    setProgression(trail)
    setSelectedProgressionId(null)
    setProgressionName("Recorrido del mandala")
    setMessage(`Tu recorrido ${trail.join(" → ")} es ahora la progresión`)
  }

  const resetResults = () => {
    analyzeMutation.reset()
    tablatureMutation.reset()
  }

  const removeChordAt = (index: number) => {
    resetResults()
    setProgression(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const moveChord = (from: number, to: number) => {
    if (to < 0 || to >= progression.length || from === to) return
    resetResults()
    setProgression(current => moveItem(current, from, to))
  }

  const loadProgression = (saved: Progression) => {
    setSelectedProgressionId(saved.id)
    setProgressionName(saved.name)
    setProgression(saved.chords)
    setTonality(saved.tonality ?? "C")
    setSelectedChord(saved.chords[0] ?? "C")
    setTrail([])
    analyzeMutation.reset()
    tablatureMutation.reset()
    setMessage(`Progresión cargada: ${saved.name}`)
    setErrorMessage(null)
  }

  const chordById = useMemo(() => new Map(chords.map(chord => [chord.id, chord])), [chords])
  const notesOf = (id: string) => {
    const chord = chordById.get(id)
    return chord ? chord.notes ?? chord.triad : []
  }

  const playProgression = () => {
    player.play(progression.map(notesOf), "progression", index => {
      if (index === null) {
        setActiveNotes([])
        return
      }
      setActiveNotes(notesOf(progression[index]))
      // The fretboard view follows the chord that is sounding.
      if (mode === "fretboard") setSelectedChord(progression[index])
    })
  }

  const previewSuggestion = (target: string) => {
    player.play([notesOf(selectedChord), notesOf(target)], `preview:${target}`, undefined, { loop: false })
  }

  const playSelectedChord = () => {
    const chord = targetChord ?? chordById.get(selectedChord)
    if (!chord) return
    playArpeggio(chord.triad, note => setActiveNotes(note ? [note] : []))
  }

  const exportGraph = (format: "png" | "svg") => {
    const svg = graphRef.current?.querySelector("svg")
    if (!svg) return
    const title = mode === "mandala" ? "chordweaver-mandala" : `chordweaver-opciones-${selectedChord}`
    if (format === "svg") downloadSvg(svg, title)
    else downloadSvgAsPng(svg, title)
  }

  const exportCurve = () => {
    const svg = curveRef.current?.querySelector("svg")
    if (svg) downloadSvgAsPng(svg, `${progressionName || "progresion"}-tension`)
  }

  const exportMidi = () => {
    const midi = progressionToMidi(progression.map(notesOf), player.settings.bpm)
    downloadBlob(new Blob([midi], { type: "audio/midi" }), `${slugify(progressionName, "progresion")}.mid`)
  }

  const analysis = analyzeMutation.data?.analysis
  // With a band style the backend already blended its habits with the engine's scores.
  const styledConnections = activeStyle ? styleData?.connections : undefined
  const rankedSuggestions = useMemo(
    () => rankSuggestions(styledConnections ?? connectionsData?.connections ?? [], suggestionMode, stylePreset),
    [styledConnections, connectionsData, suggestionMode, stylePreset],
  )
  const previewing = player.playingId?.startsWith("preview:") ? player.playingId.slice(8) : null
  const playingIndex = player.playingId === "progression" ? player.current : null
  const canAnalyze = progression.length >= 2 && !analyzeMutation.isPending
  const canSave = progression.length > 0 && progressionName.trim().length > 0 && !saveMutation.isPending
  const save = () => (user ? saveMutation.mutate() : openDialog())
  const canGenerateTablature = progression.length > 0 && !tablatureMutation.isPending
  const tablature = tablatureMutation.data

  if (chordsError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas-soft p-6">
        <section className="max-w-lg rounded-lg border border-hairline bg-canvas p-8 text-center shadow-sm">
          <h1 className="text-[28px] font-[540] tracking-[-0.63px] text-ink">No se pudo conectar con la API</h1>
          <p className="mt-3 text-sm text-ink-mute">Verifica que el backend esté corriendo en {getApiBaseUrl()}.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="thread-bg relative overflow-hidden text-on-primary">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div>
            <p className="text-xs font-[540] uppercase tracking-[0.32em] text-on-dark-mute">ChordWeaver</p>
            <h1 className="mt-5 max-w-3xl text-[42px] font-[540] leading-[0.96] tracking-[-1px] md:text-[64px]">Encuentra el siguiente acorde sin perderte en teoría.</h1>
            <p className="mt-6 max-w-xl text-lg font-[540] leading-7 tracking-[-0.135px] text-on-dark-mute">Elige un acorde base, mira las opciones recomendadas y arma una progresión que puedas escuchar, analizar y guardar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => addChordToProgression(selectedChord)} className="min-h-11 rounded-full bg-surface-violet-soft px-5 py-3 text-base font-bold text-primary transition hover:bg-white">Agregar acorde base</button>
              <button type="button" onClick={player.playingId === "progression" ? player.stop : playProgression} className="min-h-11 rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">{player.playingId === "progression" ? "■ Detener" : "Escuchar progresión"}</button>
              <Link href="/fretboard" className="inline-flex min-h-11 items-center rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">Mástil interactivo</Link>
              <Link href="/piano" className="inline-flex min-h-11 items-center rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">Piano interactivo</Link>
            </div>
          </div>
          <div className="rounded-xl border border-hairline-dark bg-primary/70 p-6 shadow-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <ChordSelector label="Acorde actual" chords={chords} value={selectedChord} onChange={selectChord} />
              <ChordSelector label="Tonalidad" chords={chords.filter(chord => chord.type === "major" || chord.type === "minor")} value={tonality} onChange={setTonality} />
            </div>
            <ol className="mt-6 grid gap-2 text-sm text-on-dark-mute md:grid-cols-3">
              <li className="rounded-md border border-hairline-dark p-3"><strong className="block text-on-primary">1. Elige</strong> un acorde base.</li>
              <li className="rounded-md border border-hairline-dark p-3"><strong className="block text-on-primary">2. Compara</strong> scores y colores.</li>
              <li className="rounded-md border border-hairline-dark p-3"><strong className="block text-on-primary">3. Guarda</strong> tu progresion.</li>
            </ol>
            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border border-hairline-dark p-3"><span className="block text-on-dark-mute">Acorde</span><strong>{targetChord?.id ?? selectedChord}</strong></div>
              <div className="rounded-md border border-hairline-dark p-3"><span className="block text-on-dark-mute">Familia</span><strong>{targetChord?.type ?? "-"}</strong></div>
              <div className="rounded-md border border-hairline-dark p-3"><span className="block text-on-dark-mute">Triada</span><strong>{targetChord?.triad.join("-") ?? "-"}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-3 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-lg border border-hairline bg-canvas p-4 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Mapa armónico</p>
              <h2 className="mt-2 text-[48px] font-[460] leading-[0.96] tracking-[-1.32px] text-ink">{mode === "mandala" ? `Mandala en ${tonality.endsWith("m") ? `${tonality.slice(0, -1)} menor` : `${tonality} mayor`}` : mode === "fretboard" ? `Intervalos de ${selectedChord}` : `Opciones para ${selectedChord}`}</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-ink-mute">{mode === "mandala" ? "Toca un acorde para avanzar: queda marcado en tu recorrido (violeta) y las flechas muestran los caminos desde él. El hilo dorado es tu progresión." : mode === "fretboard" ? "Cada punto marca un intervalo de la triada sobre el mastil. Solo se ilumina mientras suena." : "Verde suena más natural; rojo crea más tensión. Haz hover para ver el intervalo."}</p>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="map-view">Vista</label>
            <select
              id="map-view"
              value={mode}
              onChange={event => setMode(event.target.value as ViewMode)}
              className="min-h-9 rounded-md border border-ink/30 bg-canvas px-2 text-xs font-semibold text-ink outline-none focus:border-ink"
            >
              <option value="mandala">Mandala armónico</option>
              <option value="connections">Mapa simple recomendado</option>
              <option value="fretboard">Mástil de intervalos</option>
            </select>
            {mode !== "fretboard" ? (
              <>
                <button type="button" onClick={() => exportGraph("png")} className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink">Descargar PNG</button>
                <button type="button" onClick={() => exportGraph("svg")} className="min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink">Descargar SVG</button>
              </>
            ) : null}
          </div>
          <div ref={graphRef} className="rounded-md bg-canvas-soft p-1 sm:p-3">
            {connectionsError ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-md border border-hairline bg-canvas p-6 text-center text-ink-mute">No se pudieron cargar las conexiones. Revisa que el backend siga activo.</div>
            ) : chordsLoading || (connectionsLoading && mode !== "mandala") ? (
              <div role="status" aria-label="Cargando conexiones" className="flex min-h-[420px] items-center justify-center">
                <div className="aspect-square w-3/4 max-w-[420px] animate-pulse rounded-full border-[18px] border-hairline" />
              </div>
            ) : mode === "fretboard" ? (
              <GuitarFretboard chord={targetChord ?? null} activeNotes={activeNotes} onPlay={playSelectedChord} />
            ) : mode === "mandala" ? (
              <HarmonicMandala
                chords={chords}
                selected={selectedChord}
                tonality={tonality}
                connections={rankedSuggestions}
                progression={progression}
                trail={trail}
                phrase={activeStyle ? styleData?.phrase.map(step => step.chord) : undefined}
                playingIndex={playingIndex}
                onPick={selectChord}
                onUndoTrail={() => {
                  const next = undoStep(trail)
                  setTrail(next)
                  if (next.length) setSelectedChord(next[next.length - 1])
                }}
                onClearTrail={() => setTrail([])}
                onTrailToProgression={trailToProgression}
                onAdd={addChordToProgression}
                onPreview={(ids, id) => player.play(ids.map(notesOf), id, undefined, { loop: false })}
                onStopPreview={player.stop}
                playingId={player.playingId}
              />
            ) : (
              <ChordGraph sourceChord={targetChord ?? null} connections={rankedSuggestions} chords={chords} onSelectChord={selectChord} />
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-hairline bg-canvas-soft p-6">
          <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Sugerencias</p>
          <h2 className="mt-2 text-[28px] font-[540] leading-[1.14] tracking-[-0.63px]">Qué puede seguir</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-mute">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#22c55e]" />Natural</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#eab308]" />Media</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f97316]" />Tensa</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ef4444]" />Extrema</span>
          </div>
          <StylePicker
            styles={styles}
            activeId={styleId}
            weight={styleWeight}
            onChange={setStyleId}
            onWeightChange={setStyleWeight}
            suggestion={activeStyle ? styleData : undefined}
            loading={styleLoading}
            error={styleError instanceof Error ? styleError.message : null}
            playingId={player.playingId}
            onPlayPhrase={chordIds => player.play([selectedChord, ...chordIds].map(notesOf), "style:phrase", undefined, { loop: false })}
            onStop={player.stop}
            onAddPhrase={addChordsToProgression}
          />
          <SuggestionPanel
            source={selectedChord}
            suggestions={rankedSuggestions}
            mode={suggestionMode}
            preset={stylePreset}
            styleName={activeStyle?.profile.name}
            onModeChange={setSuggestionMode}
            onPresetChange={setStylePreset}
            onSelect={selectChord}
            onAdd={addChordToProgression}
            onPreview={previewSuggestion}
            previewing={previewing}
            loading={activeStyle ? styleLoading && !styleData : connectionsLoading}
          />
        </aside>
      </section>

      <section className="bg-canvas-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div className="rounded-lg border border-hairline bg-canvas p-8">
            <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Tu progresión</p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <label className="flex flex-1 flex-col gap-2 text-sm text-ink-mute">
                Ponle nombre
                <input value={progressionName} onChange={event => setProgressionName(event.target.value)} className="min-h-11 rounded-sm border border-hairline bg-canvas px-3 text-ink outline-none focus:border-hairline-dark" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => analyzeMutation.mutate()} disabled={!canAnalyze} className="min-h-11 rounded-md border border-hairline-dark bg-canvas px-5 text-base font-bold text-ink transition hover:bg-canvas-soft disabled:opacity-50">Ver tensión</button>
                <button type="button" onClick={save} disabled={!canSave || !accountsEnabled} title={accountsEnabled ? undefined : "Las cuentas no están disponibles en este servidor"} className="min-h-11 rounded-md bg-primary px-5 text-base font-bold text-on-primary transition hover:bg-primary-deep disabled:opacity-50">Guardar</button>
                <button type="button" onClick={() => tablatureMutation.mutate()} disabled={!canGenerateTablature} className="min-h-11 rounded-md bg-surface-teal-deep px-5 text-base font-bold text-on-primary transition hover:bg-surface-teal-mid disabled:opacity-50">{tablatureMutation.isPending ? "Generando..." : "Generar tablatura"}</button>
                <button type="button" onClick={exportMidi} disabled={progression.length === 0} className="min-h-11 rounded-md border border-hairline-dark bg-canvas px-5 text-base font-bold text-ink transition hover:bg-canvas-soft disabled:opacity-50">MIDI</button>
              </div>
            </div>
            <div className="mt-4">
              <PlayerControls
                settings={player.settings}
                onChange={player.setSettings}
                isPlaying={player.playingId === "progression"}
                onPlay={playProgression}
                onStop={player.stop}
                disabled={progression.length === 0}
              />
            </div>
            <p className="mt-3 text-sm text-ink-mute">Arrastra un acorde para cambiarlo de lugar (o usa las flechas). Toca × para quitarlo y el nombre para ver sus opciones.</p>
            <ol className="mt-4 flex min-h-20 flex-wrap gap-2 rounded-md border border-dashed border-hairline p-4" aria-label="Acordes de la progresión">
              {progression.length === 0 && <li className="text-sm text-ink-mute">Tu progresión está vacía. Agrega un acorde desde el mapa o las sugerencias.</li>}
              {progression.map((chord, index) => (
                <li
                  key={`${chord}-${index}`}
                  draggable
                  onDragStart={event => {
                    setDragIndex(index)
                    event.dataTransfer.effectAllowed = "move"
                  }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault()
                    if (dragIndex !== null) moveChord(dragIndex, index)
                    setDragIndex(null)
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex min-h-11 cursor-grab items-center gap-0.5 rounded-full border bg-canvas pl-1 pr-1 transition active:cursor-grabbing ${playingIndex === index ? "-translate-y-0.5 border-ink shadow-card" : "border-hairline"} ${dragIndex === index ? "opacity-40" : ""}`}
                >
                  <button type="button" onClick={() => moveChord(index, index - 1)} disabled={index === 0} aria-label={`Mover ${chord} a la izquierda`} className="h-9 w-7 rounded-full text-ink-mute hover:bg-canvas-soft disabled:opacity-25">‹</button>
                  <button type="button" onClick={() => selectChord(chord)} className="px-1 font-mono font-semibold text-ink">{chord}</button>
                  <button type="button" onClick={() => moveChord(index, index + 1)} disabled={index === progression.length - 1} aria-label={`Mover ${chord} a la derecha`} className="h-9 w-7 rounded-full text-ink-mute hover:bg-canvas-soft disabled:opacity-25">›</button>
                  <button type="button" onClick={() => removeChordAt(index)} aria-label={`Quitar acorde ${chord}`} className="h-9 w-8 rounded-full text-ink-mute hover:bg-fn-dominant/10 hover:text-fn-dominant">×</button>
                </li>
              ))}
            </ol>
            {message && <p className="mt-4 text-sm text-surface-teal-mid">{message}</p>}
            {errorMessage && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
          </div>

          <div className="rounded-lg border border-hairline bg-canvas p-8">
            <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Biblioteca</p>
            <h2 className="mt-2 text-[28px] font-[540] leading-[1.14] tracking-[-0.63px]">Progresiones guardadas</h2>
            <ul className="mt-5 space-y-2 text-sm">
              {!accountsEnabled && <li className="rounded-md bg-canvas-soft p-3 text-ink-mute">Las cuentas aún no están activas en este servidor.</li>}
              {accountsEnabled && !user && (
                <li className="rounded-md bg-canvas-soft p-4 text-ink-mute">
                  Crea una cuenta gratis para guardar tus progresiones y compartirlas con un enlace.
                  <button type="button" onClick={openDialog} className="mt-3 block min-h-10 rounded-md bg-primary px-4 font-bold text-on-primary hover:bg-primary-deep">Crear cuenta</button>
                </li>
              )}
              {user && progressionsError && <li className="rounded-md bg-canvas-soft p-3 text-ink-mute">No se pudo cargar tu biblioteca.</li>}
              {user && !progressionsError && (progressionsData?.progressions ?? []).length === 0 && <li className="rounded-md bg-canvas-soft p-3 text-ink-mute">Todavía no tienes progresiones guardadas.</li>}
              {(progressionsData?.progressions ?? []).map(saved => (
                <li key={saved.id} className="flex items-center justify-between gap-2 rounded-md bg-canvas-soft p-3">
                  <button type="button" onClick={() => loadProgression(saved)} className="text-left"><strong>{saved.name}</strong><span className="block font-mono text-ink-mute">{saved.chords.join(" - ")}</span></button>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => shareMutation.mutate(saved)} className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas">{saved.isPublic ? "Copiar enlace" : "Compartir"}</button>
                    <button type="button" onClick={() => setPendingDelete(saved)} className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas">Eliminar</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {analysis && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-lg border border-hairline bg-canvas p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Análisis · {analysis.key?.label}</p>
                <h2 className="mt-2 text-[48px] font-[460] leading-[0.96] tracking-[-1.32px]">Curva de tensión</h2>
                <p className="mt-3 text-sm text-ink-mute">Score promedio: {analysis.averageScore}</p>
                <button type="button" onClick={exportCurve} className="mt-3 min-h-9 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink">Descargar PNG</button>
              </div>
              <div className="max-w-md text-sm leading-6 text-ink-mute">
                <p>{analysis.suggestions.join(" ")}</p>
                <Link href={`/?chords=${encodeURIComponent(progression.join(","))}&key=${encodeURIComponent(tonality)}`} className="mt-2 inline-block font-bold text-ink underline underline-offset-4">Ver grados y sustituciones</Link>
              </div>
            </div>
            <div ref={curveRef} className="mt-8">
              <TensionCurve points={analysis.tensionCurve} chords={analysis.chords} />
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analysis.tensionCurve.map(point => (
                <article key={`${point.from}-${point.to}`} className="rounded-md bg-canvas-soft p-6">
                  <div className="flex items-center justify-between"><strong>{point.from} -&gt; {point.to}</strong><span style={{ color: categoryColor(point.category) }}>{point.score}</span></div>
                  <div className="mt-4 h-2 rounded-full bg-hairline"><div className="h-2 rounded-full" style={{ width: `${point.score}%`, backgroundColor: categoryColor(point.category) }} /></div>
                  <p className="mt-3 text-sm text-ink-mute">{connectionLabel(point.category)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-lg bg-surface-teal-deep p-10 text-on-primary md:p-16">
          <h2 className="max-w-2xl text-[28px] font-[540] leading-[1.14] tracking-[-0.63px]">Cada progresión termina resolviendo en una decision: guardar, escuchar o volver a explorar.</h2>
          <button type="button" onClick={() => analyzeMutation.mutate()} disabled={!canAnalyze} className="mt-8 min-h-11 rounded-md bg-canvas px-5 text-base font-bold text-surface-teal-deep transition hover:bg-canvas-soft disabled:opacity-50">Analizar progresión actual</button>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar "${pendingDelete?.name ?? ""}"?`}
        body="La progresión se borrará de tu biblioteca. Si la compartiste, el enlace dejará de funcionar."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id)
          setPendingDelete(null)
        }}
      />

      {isTablatureModalOpen && tablature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 p-4" role="dialog" aria-modal="true" aria-labelledby="tablature-title">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-hairline bg-canvas p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Tablatura generada</p>
                <h2 id="tablature-title" className="mt-2 text-[28px] font-[540] leading-[1.14] tracking-[-0.63px] text-ink">{tablature.title}</h2>
                <p className="mt-2 text-sm text-ink-mute">Acordes: {tablature.chords.join(" - ")}</p>
              </div>
              <button type="button" onClick={() => setIsTablatureModalOpen(false)} className="min-h-11 rounded-md border border-hairline-dark px-4 text-sm font-bold text-ink hover:bg-canvas-soft">Cerrar</button>
            </div>
            <pre className="mt-6 overflow-auto rounded-md bg-canvas-soft p-5 text-sm leading-7 text-ink">{tablature.text}</pre>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadTablaturePng(tablature)} className="min-h-11 rounded-md bg-primary px-5 text-base font-bold text-on-primary hover:bg-primary-deep">Guardar PNG</button>
              <button type="button" onClick={() => downloadTablatureText(tablature)} className="min-h-11 rounded-md border border-hairline-dark bg-canvas px-5 text-base font-bold text-ink hover:bg-canvas-soft">Guardar TXT</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
