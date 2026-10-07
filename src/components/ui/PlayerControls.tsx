"use client"

import { PlayerSettings } from "@/lib/audio/usePlayer"

type Props = {
  settings: PlayerSettings
  onChange: (settings: PlayerSettings) => void
  isPlaying: boolean
  onPlay: () => void
  onStop: () => void
  disabled?: boolean
  playLabel?: string
}

/** Play/stop, tempo, loop and volume for a chord sequence. */
export default function PlayerControls({ settings, onChange, isPlaying, onPlay, onStop, disabled, playLabel = "Escuchar" }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm">
      <button
        type="button"
        onClick={isPlaying ? onStop : onPlay}
        disabled={disabled && !isPlaying}
        className="min-h-11 rounded-md bg-primary px-5 font-bold text-on-primary hover:bg-primary-deep disabled:opacity-50"
      >
        {isPlaying ? "■ Detener" : `▶ ${playLabel}`}
      </button>
      <label className="flex items-center gap-2 text-ink-mute">
        Tempo
        <input
          type="range"
          min={50}
          max={200}
          step={2}
          value={settings.bpm}
          onChange={event => onChange({ ...settings, bpm: Number(event.target.value) })}
          className="w-24 accent-[#16132a]"
        />
        <span className="w-16 font-mono text-ink">{settings.bpm} bpm</span>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-ink-mute">
        <input
          type="checkbox"
          checked={settings.loop}
          onChange={event => onChange({ ...settings, loop: event.target.checked })}
          className="h-4 w-4 accent-[#16132a]"
        />
        Repetir
      </label>
      <label className="flex items-center gap-2 text-ink-mute">
        Volumen
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={event => onChange({ ...settings, volume: Number(event.target.value) })}
          className="w-20 accent-[#16132a]"
          aria-valuetext={`${Math.round(settings.volume * 100)}%`}
        />
      </label>
    </div>
  )
}
