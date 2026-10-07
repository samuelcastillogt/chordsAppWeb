"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Playback, playSequence } from "@/lib/audio"

export type PlayerSettings = { bpm: number; loop: boolean; volume: number }

/** One playback at a time per component, with tempo/loop/volume settings and the sounding index. */
export function usePlayer(initial: Partial<PlayerSettings> = {}) {
  const [settings, setSettings] = useState<PlayerSettings>({ bpm: 112, loop: false, volume: 0.8, ...initial })
  const [current, setCurrent] = useState<number | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const playback = useRef<Playback | null>(null)

  const stop = useCallback(() => {
    playback.current?.stop()
    playback.current = null
  }, [])

  /** `id` tells callers which sequence is playing (e.g. "A" or "B" in a comparison). */
  const play = useCallback(
    (chordNotes: string[][], id = "main", onStep?: (index: number | null) => void, overrides: Partial<PlayerSettings> = {}) => {
      stop()
      setPlayingId(id)
      const options = { ...settings, ...overrides }
      playback.current = playSequence(chordNotes, {
        ...options,
        onStep: index => {
          setCurrent(index)
          if (index === null) setPlayingId(null)
          onStep?.(index)
        },
      })
    },
    [settings, stop],
  )

  useEffect(() => stop, [stop])

  return { settings, setSettings, current, playingId, isPlaying: playingId !== null, play, stop }
}
