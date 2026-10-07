"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"

import ConfirmDialog from "@/components/ui/ConfirmDialog"
import { get, post } from "@/lib/api"
import { CHROMATIC_NOTES } from "@/lib/music/theory"
import { dominantMode, loadStyles, realizeToken, saveStyles, upsertStyle } from "@/lib/music/style"
import { usePlayer } from "@/lib/audio/usePlayer"
import { Chord, SavedStyle, StyleParseResponse, StyleProfile, StyleSource } from "@/types"

type Draft = StyleSource & { id: number }

const EXAMPLE = `[Intro]
Am  F  C  G

[Verso]
Am           F
Aquí va la letra de la canción
C                G
con los acordes encima de cada línea

[Coro]
F   G   Am
F   G   E7  Am

e|-----0-----|-----3-----|
B|---1---1---|---0---0---|
G|-2-------2-|-0-------0-|
D|-2---------|-----------|
A|-0---------|-----------|
E|-----------|-3---------|`

const KEYS = CHROMATIC_NOTES.flatMap(note => [note, `${note}m`])

let nextDraftId = 1
const draft = (source: Partial<StyleSource> = {}): Draft => ({ id: nextDraftId++, title: source.title ?? "", key: source.key ?? "", text: source.text ?? "" })

export default function StylePage() {
  const [name, setName] = useState("")
  const [songs, setSongs] = useState<Draft[]>(() => [draft()])
  const [styles, setStyles] = useState<SavedStyle[]>([])
  const [profile, setProfile] = useState<StyleProfile | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SavedStyle | null>(null)
  const player = usePlayer()

  useEffect(() => setStyles(loadStyles()), [])

  const { data: chords = [] } = useQuery<Chord[]>({ queryKey: ["chords"], queryFn: () => get<Chord[]>("/api/v1/chords") })
  const notesOf = useMemo(() => {
    const byId = new Map(chords.map(chord => [chord.id, chord]))
    return (id: string) => byId.get(id)?.notes ?? byId.get(id)?.triad ?? []
  }, [chords])

  const learn = useMutation({
    mutationFn: () =>
      post<StyleProfile>("/api/v1/style/learn", {
        name: name.trim(),
        songs: songs.filter(song => song.text.trim()).map(song => ({ title: song.title.trim() || undefined, key: song.key || undefined, text: song.text })),
      }),
    onSuccess: learned => {
      const sources = songs.filter(song => song.text.trim()).map(({ title, key, text }) => ({ title, key, text }))
      const { styles: next, saved } = upsertStyle(styles, learned, new Date(), sources)
      setProfile(learned)
      setSavedId(saved.id)
      setStyles(next)
      setMessage(
        saveStyles(next)
          ? `Estilo "${learned.name}" guardado en este navegador.`
          : "Aprendido, pero este navegador no permite guardarlo: se perderá al recargar.",
      )
    },
  })

  const openSaved = (style: SavedStyle) => {
    setName(style.profile.name)
    setProfile(style.profile)
    setSavedId(style.id)
    setSongs(style.sources?.length ? style.sources.map(draft) : [draft()])
    setMessage(null)
    learn.reset()
  }

  const removeSaved = (style: SavedStyle) => {
    const next = styles.filter(item => item.id !== style.id)
    setStyles(next)
    saveStyles(next)
    if (savedId === style.id) {
      setProfile(null)
      setSavedId(null)
    }
  }

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const read = await Promise.all(Array.from(files).map(async file => draft({ title: file.name.replace(/\.[^.]+$/, ""), text: await file.text() })))
    setSongs(current => [...current.filter(song => song.text.trim() || song.title.trim()), ...read])
  }

  const update = (id: number, patch: Partial<StyleSource>) => setSongs(current => current.map(song => (song.id === id ? { ...song, ...patch } : song)))
  const filled = songs.filter(song => song.text.trim()).length
  const canLearn = name.trim().length > 0 && filled > 0 && !learn.isPending

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="thread-bg text-on-primary">
        <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
          <p className="text-xs font-[540] uppercase tracking-[0.32em] text-on-dark-mute">Estilo de banda</p>
          <h1 className="mt-4 max-w-3xl text-[40px] font-[540] leading-[0.98] tracking-[-1px] md:text-[56px]">
            Aprende cómo arma sus acordes una banda y compón con su toque.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-7 text-on-dark-mute">
            Pega cifrados (acordes sobre la letra), ChordPro o tablaturas. Pasamos cada canción a grados de su tonalidad, encontramos los caminos y bucles que
            repite la banda y los usamos para sugerirte el siguiente acorde en cualquier tono.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-3 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="rounded-lg border border-hairline bg-canvas p-4 sm:p-8">
          <label className="flex flex-col gap-2 text-sm text-ink-mute">
            Nombre de la banda
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Ej. Mi banda favorita"
              maxLength={80}
              className="min-h-11 rounded-sm border border-hairline bg-canvas px-3 text-ink outline-none focus:border-hairline-dark"
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[22px] font-[540] tracking-[-0.4px]">Canciones ({filled})</h2>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-hairline px-3 text-sm font-semibold hover:border-ink">
                Subir .txt
                <input type="file" accept=".txt,.pro,.chopro,.cho,text/plain" multiple className="sr-only" onChange={event => addFiles(event.target.files)} />
              </label>
              <button
                type="button"
                onClick={() => setSongs(current => [...current, draft()])}
                className="min-h-10 rounded-md border border-hairline px-3 text-sm font-semibold hover:border-ink"
              >
                + Canción
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-ink-mute">
            Entre más canciones, mejores patrones: con 5 a 10 ya se nota el estilo. Los bloques de tablatura de 6 cuerdas se convierten en acordes
            automáticamente.
          </p>

          <ol className="mt-4 space-y-4">
            {songs.map((song, index) => (
              <SongEditor
                key={song.id}
                song={song}
                index={index}
                onChange={patch => update(song.id, patch)}
                onRemove={songs.length > 1 ? () => setSongs(current => current.filter(item => item.id !== song.id)) : undefined}
                onExample={!song.text ? () => update(song.id, { text: EXAMPLE, title: song.title || "Ejemplo" }) : undefined}
              />
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => learn.mutate()}
              disabled={!canLearn}
              className="min-h-11 rounded-md bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-deep disabled:opacity-50"
            >
              {learn.isPending ? "Aprendiendo..." : "Aprender estilo"}
            </button>
            {!name.trim() ? <span className="text-sm text-ink-mute">Ponle nombre a la banda para guardarlo.</span> : null}
          </div>
          {learn.error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {learn.error instanceof Error ? learn.error.message : "No se pudo aprender el estilo"}
            </p>
          ) : null}
          {message ? <p className="mt-3 text-sm text-surface-teal-mid">{message}</p> : null}
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-hairline bg-canvas-soft p-6">
            <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Guardados en este navegador</p>
            {styles.length === 0 ? <p className="mt-3 text-sm text-ink-mute">Todavía no has aprendido ningún estilo.</p> : null}
            <ul className="mt-3 space-y-2 text-sm">
              {styles.map(style => (
                <li key={style.id} className={`rounded-md border bg-canvas p-3 ${style.id === savedId ? "border-ink" : "border-hairline"}`}>
                  <button type="button" onClick={() => openSaved(style)} className="w-full text-left">
                    <strong>{style.profile.name}</strong>
                    <span className="block text-xs text-ink-mute">
                      {style.profile.songs.length} canciones · {style.profile.patterns.length} patrones
                    </span>
                  </button>
                  <span className="mt-2 flex gap-1.5">
                    <Link
                      href={`/explorer?style=${encodeURIComponent(style.id)}`}
                      className="inline-flex min-h-8 items-center rounded-md bg-primary px-3 text-xs font-bold text-on-primary hover:bg-primary-deep"
                    >
                      Componer con este estilo
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(style)}
                      className="min-h-8 rounded-md border border-hairline px-3 text-xs font-semibold hover:border-ink"
                    >
                      Eliminar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {profile ? <ProfileView profile={profile} styleId={savedId} notesOf={notesOf} player={player} /> : null}
        </aside>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar el estilo "${pendingDelete?.profile.name ?? ""}"?`}
        body="Se borrará de este navegador junto con las canciones que pegaste."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeSaved(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </main>
  )
}

type SongEditorProps = { song: Draft; index: number; onChange: (patch: Partial<StyleSource>) => void; onRemove?: () => void; onExample?: () => void }

function SongEditor({ song, index, onChange, onRemove, onExample }: SongEditorProps) {
  const check = useMutation({
    mutationFn: () => post<StyleParseResponse>("/api/v1/style/parse", { text: song.text, title: song.title || undefined, key: song.key || undefined }),
  })
  const result = check.data

  return (
    <li className="rounded-md border border-hairline bg-canvas-soft p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
        <input
          value={song.title}
          onChange={event => onChange({ title: event.target.value })}
          placeholder={`Canción ${index + 1}`}
          aria-label={`Título de la canción ${index + 1}`}
          maxLength={120}
          className="min-h-10 rounded-sm border border-hairline bg-canvas px-3 text-sm outline-none focus:border-hairline-dark"
        />
        <select
          value={song.key}
          onChange={event => onChange({ key: event.target.value })}
          aria-label={`Tonalidad de la canción ${index + 1}`}
          className="min-h-10 rounded-sm border border-hairline bg-canvas px-2 text-sm outline-none focus:border-hairline-dark"
        >
          <option value="">Tono: auto</option>
          {KEYS.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar la canción ${index + 1}`}
            className="min-h-10 rounded-md border border-hairline px-3 text-sm hover:border-ink"
          >
            Quitar
          </button>
        ) : null}
      </div>
      <textarea
        value={song.text}
        onChange={event => {
          onChange({ text: event.target.value })
          check.reset()
        }}
        rows={8}
        spellCheck={false}
        placeholder="Pega aquí el cifrado o la tablatura…"
        aria-label={`Cifrado o tablatura de la canción ${index + 1}`}
        className="mt-2 w-full rounded-sm border border-hairline bg-canvas p-3 font-mono text-xs leading-5 outline-none focus:border-hairline-dark"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => check.mutate()}
          disabled={!song.text.trim() || check.isPending}
          className="min-h-8 rounded-md border border-hairline px-3 font-semibold hover:border-ink disabled:opacity-50"
        >
          {check.isPending ? "Leyendo..." : "Revisar acordes"}
        </button>
        {onExample ? (
          <button type="button" onClick={onExample} className="min-h-8 rounded-md px-2 font-semibold text-ink-mute underline underline-offset-4">
            Ver un ejemplo de formato
          </button>
        ) : null}
        {check.error ? <span className="text-red-700">{check.error instanceof Error ? check.error.message : "No se pudo leer"}</span> : null}
      </div>
      {result ? (
        <div className="mt-2 rounded-md border border-hairline bg-canvas p-2 text-xs">
          {result.chords.length ? (
            <>
              <p>
                <strong>{result.chords.length} acordes</strong>
                {result.keyLabel ? (
                  <>
                    {" "}
                    · tonalidad {song.key ? "elegida" : "detectada"}: <strong>{result.keyLabel}</strong>
                  </>
                ) : null}
                {result.tabChords ? ` · ${result.tabChords} leídos de tablatura` : ""}
              </p>
              <ul className="mt-1 space-y-0.5 font-mono">
                {result.sections.map((section, sectionIndex) => (
                  <li key={sectionIndex}>
                    <span className="text-ink-mute">{section.name || "—"}:</span> {section.chords.join(" ")}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-red-700">
              No encontré acordes. Revisa que estén en líneas propias (acordes sobre la letra), entre corchetes [Am] o en tablatura de 6 cuerdas.
            </p>
          )}
          {result.unknown.length ? <p className="mt-1 text-ink-mute">Ignorados: {result.unknown.join(", ")}</p> : null}
        </div>
      ) : null}
    </li>
  )
}

type ProfileViewProps = { profile: StyleProfile; styleId: string | null; notesOf: (id: string) => string[]; player: ReturnType<typeof usePlayer> }

function ProfileView({ profile, styleId, notesOf, player }: ProfileViewProps) {
  const mode = dominantMode(profile)
  const firstKey = profile.songs.find(song => song.key.endsWith("m") === (mode === "minor"))?.key ?? (mode === "minor" ? "Am" : "C")
  const [key, setKey] = useState(firstKey)
  useEffect(() => setKey(firstKey), [firstKey])

  const realize = (tokens: string[]) => tokens.map(token => realizeToken(token, key, profile.colors)).filter((id): id is string => Boolean(id))
  const topChords = Object.entries(profile.usage).slice(0, 8)

  return (
    <div className="rounded-lg border border-hairline bg-canvas p-6">
      <p className="text-xs font-[540] uppercase tracking-[0.2em] text-ink-mute">Perfil aprendido</p>
      <h2 className="mt-1 text-[26px] font-[540] tracking-[-0.5px]">{profile.name}</h2>
      {profile.skipped?.length ? <p className="mt-1 text-xs text-red-700">Sin acordes legibles: {profile.skipped.join(", ")}</p> : null}

      <ul className="mt-3 space-y-1.5 text-sm">
        {profile.traits.map(trait => (
          <li key={trait} className="flex gap-2">
            <span aria-hidden="true" className="text-[#7b5cd6]">
              ●
            </span>
            {trait}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Patrones que repite</h3>
        <label className="flex items-center gap-1 text-xs text-ink-mute">
          en
          <select
            value={key}
            onChange={event => setKey(event.target.value)}
            aria-label="Tonalidad para ver los patrones"
            className="min-h-8 rounded-md border border-hairline bg-canvas px-1 text-ink"
          >
            {KEYS.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {profile.patterns.length === 0 ? <p className="mt-2 text-sm text-ink-mute">Aún no hay secuencias repetidas. Agrega más canciones.</p> : null}
      <ul className="mt-2 space-y-2">
        {profile.patterns.map(pattern => {
          const chordIds = realize(pattern.tokens)
          const id = `pattern:${pattern.tokens.join("|")}`
          const playing = player.playingId === id
          return (
            <li key={pattern.tokens.join("|")} className="rounded-md bg-canvas-soft p-2.5 text-xs">
              <p className="font-display text-base text-ink">
                {pattern.numerals.join(" → ")}
                {pattern.loop ? (
                  <span className="ml-2 rounded-full bg-[#7b5cd6] px-2 py-0.5 align-middle font-sans text-[10px] font-bold text-[#fffdf8]">bucle</span>
                ) : null}
              </p>
              <p className="font-mono font-semibold">{chordIds.join(" → ")}</p>
              <p className="mt-0.5 text-ink-mute">
                {pattern.songs} {pattern.songs === 1 ? "canción" : "canciones"} · {pattern.count} {pattern.count === 1 ? "vez" : "veces"}
              </p>
              <span className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => (playing ? player.stop() : player.play(chordIds.map(notesOf), id, undefined, { loop: false }))}
                  className="min-h-8 rounded-md border border-hairline px-2 font-semibold hover:border-ink"
                >
                  {playing ? "■ Detener" : "▶ Escuchar"}
                </button>
                <Link
                  href={`/explorer?chords=${encodeURIComponent(chordIds.join(","))}&key=${encodeURIComponent(key)}${styleId ? `&style=${encodeURIComponent(styleId)}` : ""}`}
                  className="inline-flex min-h-8 items-center rounded-md border border-hairline px-2 font-semibold hover:border-ink"
                >
                  Seguir componiendo desde aquí
                </Link>
              </span>
            </li>
          )
        })}
      </ul>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Acordes más usados</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {topChords.map(([token, usage]) => (
          <li key={token} className="rounded-full border border-hairline px-2 py-1" title={`${usage.count} veces`}>
            <span className="font-display text-sm">{usage.numeral}</span>{" "}
            <span className="text-ink-mute">
              {usage.songs}/{profile.songs.length}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-mute">Canciones</h3>
      <ul className="mt-2 space-y-1 text-xs">
        {profile.songs.map((song, index) => (
          <li key={`${song.title}-${index}`}>
            <strong>{song.title}</strong>{" "}
            <span className="text-ink-mute">
              · {song.keyLabel} · {song.chords.length} acordes
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
