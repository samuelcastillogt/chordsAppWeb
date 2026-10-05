"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ChordGraph from "@/components/ChordGraph"
import ChordSelector from "@/components/ChordSelector"
import GuitarFretboard from "@/components/GuitarFretboard"
import { appUrl, del, get, getApiBaseUrl, post, put } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { categoryColor, connectionLabel, noteToFrequency } from "@/lib/music"
import { AnalyzeResponse, Chord, ConnectionsResponse, ParsedChord, Progression, TablatureResponse } from "@/types"

const DEFAULT_PROGRESSION = ["C", "G7", "Am", "F"]

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

function playChord(notes: string[], startAt: number, context: AudioContext) {
  notes.forEach(note => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "triangle"
    oscillator.frequency.value = noteToFrequency(note, 4)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.85)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.9)
  })
}

function playNote(note: string, startAt: number, context: AudioContext) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = "triangle"
  oscillator.frequency.value = noteToFrequency(note, 4)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.36)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + 0.38)
}

function filenameFromTitle(title: string, extension: string) {
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tablature"
  return `${safeTitle}.${extension}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function downloadTablatureText(tablature: TablatureResponse) {
  downloadBlob(new Blob([tablature.text], { type: "text/plain;charset=utf-8" }), filenameFromTitle(tablature.title, "txt"))
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
    if (blob) downloadBlob(blob, filenameFromTitle(tablature.title, "png"))
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
  const [mode, setMode] = useState<"connections" | "mandala" | "fretboard">("connections")
  const [activeNotes, setActiveNotes] = useState<string[]>([])
  const [selectedProgressionId, setSelectedProgressionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isTablatureModalOpen, setIsTablatureModalOpen] = useState(false)

  const { data: chords = [], isLoading: chordsLoading, error: chordsError } = useQuery<Chord[]>({
    queryKey: ["chords"],
    queryFn: () => get<Chord[]>("/api/v1/chords"),
  })

  const { data: connectionsData, isLoading: connectionsLoading, error: connectionsError } = useQuery<ConnectionsResponse>({
    queryKey: ["connections", selectedChord, tonality],
    queryFn: () => get<ConnectionsResponse>(`/api/v1/chords/${selectedChord}/connections`, { tonality, min_score: 0, max_results: 18 }),
    enabled: !!selectedChord,
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

  // Deep links: ?chords=Bm,G,D,A&key=Bm (from the analyzer or the songbook) or ?p=<shared id>.
  useEffect(() => {
    if (loadedFromUrl.current) return
    loadedFromUrl.current = true
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

  const addChordToProgression = (chord: string) => {
    analyzeMutation.reset()
    tablatureMutation.reset()
    setProgression(current => [...current, chord])
    setSelectedChord(chord)
    setMessage(`${chord} agregado a tu progresión`)
  }

  const removeChordAt = (index: number) => {
    analyzeMutation.reset()
    tablatureMutation.reset()
    setProgression(current => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const loadProgression = (saved: Progression) => {
    setSelectedProgressionId(saved.id)
    setProgressionName(saved.name)
    setProgression(saved.chords)
    setTonality(saved.tonality ?? "C")
    setSelectedChord(saved.chords[0] ?? "C")
    analyzeMutation.reset()
    tablatureMutation.reset()
    setMessage(`Progresión cargada: ${saved.name}`)
    setErrorMessage(null)
  }

  const playProgression = () => {
    const audioWindow = window as AudioWindow
    const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioCtor) return
    const context = new AudioCtor()
    progression.forEach((chordId, index) => {
      const chord = chords.find(item => item.id === chordId)
      if (chord) {
        const delay = index * 1050
        playChord(chord.notes ?? chord.triad, context.currentTime + index * 1.05, context)
        window.setTimeout(() => {
          setSelectedChord(chord.id)
          setActiveNotes(chord.notes ?? chord.triad)
        }, delay)
        window.setTimeout(() => setActiveNotes([]), delay + 900)
      }
    })
  }

  const playSelectedChord = () => {
    const chord = targetChord ?? chords.find(item => item.id === selectedChord)
    const audioWindow = window as AudioWindow
    const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioCtor || !chord) return
    const context = new AudioCtor()
    chord.triad.forEach((note, index) => {
      playNote(note, context.currentTime + index * 0.42, context)
      window.setTimeout(() => setActiveNotes([note]), index * 420)
    })
    window.setTimeout(() => setActiveNotes([]), chord.triad.length * 420 + 180)
  }

  const analysis = analyzeMutation.data?.analysis
  const selectedConnections = connectionsData?.connections ?? []
  const canAnalyze = progression.length >= 2 && !analyzeMutation.isPending
  const canSave = progression.length > 0 && progressionName.trim().length > 0 && !saveMutation.isPending
  const save = () => (user ? saveMutation.mutate() : openDialog())
  const canGenerateTablature = progression.length > 0 && !tablatureMutation.isPending
  const tablature = tablatureMutation.data

  const deleteProgression = (id: string) => {
    if (window.confirm("Esta progresión se eliminará. ¿Deseas continuar?")) {
      deleteMutation.mutate(id)
    }
  }

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
              <button type="button" onClick={playProgression} className="min-h-11 rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">Escuchar ejemplo</button>
              <Link href="/fretboard" className="inline-flex min-h-11 items-center rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">Mástil interactivo</Link>
              <Link href="/piano" className="inline-flex min-h-11 items-center rounded-full border border-hairline-dark px-5 py-3 text-base font-bold text-on-primary transition hover:bg-white/10">Piano interactivo</Link>
            </div>
          </div>
          <div className="rounded-xl border border-hairline-dark bg-primary/70 p-6 shadow-2xl">
            <div className="grid gap-4 sm:grid-cols-3">
              <ChordSelector label="Acorde actual" chords={chords} value={selectedChord} onChange={setSelectedChord} />
              <ChordSelector label="Tonalidad" chords={chords.filter(chord => chord.type === "major" || chord.type === "minor")} value={tonality} onChange={setTonality} />
              <label className="flex flex-col gap-1 text-sm text-on-dark-mute">
                Vista
                <select value={mode} onChange={event => setMode(event.target.value as "connections" | "mandala" | "fretboard")} className="min-h-11 rounded-md border border-hairline-dark bg-primary px-3 py-2 text-on-primary outline-none focus:border-surface-violet-soft focus:ring-2 focus:ring-surface-violet-soft/30">
                <option value="connections">Mapa simple recomendado</option>
                <option value="mandala">Mandala completo</option>
                <option value="fretboard">Mástil de intervalos</option>
                </select>
              </label>
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

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-lg border border-hairline bg-canvas p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Mapa armónico</p>
              <h2 className="mt-2 text-[48px] font-[460] leading-[0.96] tracking-[-1.32px] text-ink">{mode === "mandala" ? "Todos los acordes" : mode === "fretboard" ? `Intervalos de ${selectedChord}` : `Opciones para ${selectedChord}`}</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-ink-mute">{mode === "mandala" ? "Las flechas muestran la direccion sugerida. Doble flecha indica ida y vuelta; punteado son relativos y lineas dobles son paralelos." : mode === "fretboard" ? "Cada punto marca un intervalo de la triada sobre el mastil. Solo se ilumina mientras suena." : "Verde suena más natural; rojo crea más tensión. Haz hover para ver el intervalo."}</p>
          </div>
          <div className="rounded-md bg-canvas-soft p-3">
            {connectionsError ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-md border border-hairline bg-canvas p-6 text-center text-ink-mute">No se pudieron cargar las conexiones. Revisa que el backend siga activo.</div>
            ) : chordsLoading || connectionsLoading ? (
              <div className="flex min-h-[420px] items-center justify-center text-ink-mute">Cargando conexiones...</div>
            ) : mode === "fretboard" ? (
              <GuitarFretboard chord={targetChord ?? null} activeNotes={activeNotes} onPlay={playSelectedChord} />
            ) : (
              <ChordGraph sourceChord={targetChord ?? null} connections={selectedConnections} chords={chords} mode={mode} onSelectChord={setSelectedChord} />
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-hairline bg-canvas-soft p-6">
          <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Sugerencias</p>
          <h2 className="mt-2 text-[28px] font-[540] leading-[1.14] tracking-[-0.63px]">Qué puede seguir</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-mute">
            {mode === "mandala" ? (
              <>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f472b6]" />Mayores</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#38bdf8]" />Menores</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#8b5cf6]" />Dim / dim7</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#facc15]" />Dominantes</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#22c55e]" />Aumentados</span>
              </>
            ) : (
              <>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#22c55e]" />Natural</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#eab308]" />Media</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f97316]" />Tensa</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ef4444]" />Extrema</span>
              </>
            )}
          </div>
          <ul className="mt-5 max-h-[520px] space-y-2 overflow-auto pr-1 text-sm">
            {selectedConnections.length === 0 && !connectionsLoading && (
              <li className="rounded-md border border-hairline bg-canvas p-4 text-ink-mute">No hay sugerencias disponibles para este acorde.</li>
            )}
            {selectedConnections.map(conn => (
              <li key={conn.target}>
                <div className="rounded-md border border-hairline bg-canvas p-3 transition hover:border-hairline-dark">
                  <button type="button" onClick={() => setSelectedChord(conn.target)} className="flex min-h-8 w-full items-center justify-between text-left">
                    <span><strong>{conn.target}</strong><span className="ml-2 text-ink-mute">{connectionLabel(conn.category)}</span></span>
                    <span className="font-mono" style={{ color: categoryColor(conn.category) }}>{conn.score}</span>
                  </button>
                  <button type="button" onClick={() => addChordToProgression(conn.target)} className="mt-2 min-h-9 rounded-md bg-primary px-3 text-xs font-bold text-on-primary hover:bg-primary-deep">Agregar a mi progresión</button>
                </div>
              </li>
            ))}
          </ul>
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
                <button type="button" onClick={playProgression} disabled={progression.length === 0} className="min-h-11 rounded-md border border-hairline-dark bg-canvas px-5 text-base font-bold text-ink transition hover:bg-canvas-soft disabled:opacity-50">Escuchar</button>
                <button type="button" onClick={() => analyzeMutation.mutate()} disabled={!canAnalyze} className="min-h-11 rounded-md border border-hairline-dark bg-canvas px-5 text-base font-bold text-ink transition hover:bg-canvas-soft disabled:opacity-50">Ver tensión</button>
                <button type="button" onClick={save} disabled={!canSave || !accountsEnabled} title={accountsEnabled ? undefined : "Las cuentas no están disponibles en este servidor"} className="min-h-11 rounded-md bg-primary px-5 text-base font-bold text-on-primary transition hover:bg-primary-deep disabled:opacity-50">Guardar</button>
                <button type="button" onClick={() => tablatureMutation.mutate()} disabled={!canGenerateTablature} className="min-h-11 rounded-md bg-surface-teal-deep px-5 text-base font-bold text-on-primary transition hover:bg-surface-teal-mid disabled:opacity-50">{tablatureMutation.isPending ? "Generando..." : "Generar tablatura"}</button>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-mute">Tip: toca cualquier chip para quitarlo. Usa las sugerencias para agregar acordes sin buscar en el selector.</p>
            <div className="mt-6 flex min-h-20 flex-wrap gap-2 rounded-md border border-dashed border-hairline p-4">
              {progression.length === 0 && <span className="text-sm text-ink-mute">Tu progresión está vacía. Agrega un acorde desde el mapa o las sugerencias.</span>}
              {progression.map((chord, index) => (
                <button key={`${chord}-${index}`} type="button" onClick={() => removeChordAt(index)} className="min-h-11 rounded-full border border-hairline bg-canvas px-4 font-semibold text-ink transition hover:border-hairline-dark" aria-label={`Quitar acorde ${chord}`}>{chord}</button>
              ))}
            </div>
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
                    <button type="button" onClick={() => deleteProgression(saved.id)} className="rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas">Eliminar</button>
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
              </div>
              <div className="max-w-md text-sm leading-6 text-ink-mute">
                <p>{analysis.suggestions.join(" ")}</p>
                <Link href={`/?chords=${encodeURIComponent(progression.join(","))}&key=${encodeURIComponent(tonality)}`} className="mt-2 inline-block font-bold text-ink underline underline-offset-4">Ver grados y sustituciones</Link>
              </div>
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
