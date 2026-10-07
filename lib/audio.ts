import { noteToFrequency } from "@/lib/music"

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }

let sharedContext: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const audioWindow = window as AudioWindow
  const AudioCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext
  if (!AudioCtor) return null
  sharedContext ??= new AudioCtor()
  if (sharedContext.state === "suspended") void sharedContext.resume()
  return sharedContext
}

/** Plays chord tones as a soft triangle-wave strum. */
export function playChordNotes(notes: string[], startAt: number, context: AudioContext, duration = 0.9, destination: AudioNode = context.destination) {
  notes.forEach((note, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const offset = index * 0.025
    oscillator.type = "triangle"
    // Lower the root an octave so the chord has a bass.
    oscillator.frequency.value = noteToFrequency(note, index === 0 ? 3 : 4)
    gain.gain.setValueAtTime(0.0001, startAt + offset)
    gain.gain.exponentialRampToValueAtTime(0.16, startAt + offset + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(startAt + offset)
    oscillator.stop(startAt + duration + 0.05)
  })
}

/** Plays single notes one after another (arpeggio). */
export function playArpeggio(notes: string[], onStep?: (note: string | null) => void, gap = 0.42) {
  const context = getAudioContext()
  if (!context) return
  notes.forEach((note, index) => {
    const startAt = context.currentTime + index * gap
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
    if (onStep) window.setTimeout(() => onStep(note), index * gap * 1000)
  })
  if (onStep) window.setTimeout(() => onStep(null), notes.length * gap * 1000 + 180)
}

export type PlaybackOptions = {
  bpm?: number
  beatsPerChord?: number
  loop?: boolean
  /** 0..1 */
  volume?: number
  onStep?: (index: number | null) => void
}

export type Playback = { stop: () => void }

/** Seconds each chord lasts at a tempo. */
export function chordSeconds(bpm: number, beatsPerChord = 2) {
  return (60 / bpm) * beatsPerChord
}

/**
 * Plays a sequence of chords, one at a time so it can loop and be stopped.
 * Reports the index sounding through `onStep` (null when it ends or stops).
 */
export function playSequence(chordNotes: string[][], options: PlaybackOptions = {}): Playback {
  const { bpm = 112, beatsPerChord = 2, loop = false, volume = 0.8, onStep } = options
  const context = getAudioContext()
  if (!context || chordNotes.length === 0) return { stop: () => undefined }

  const master = context.createGain()
  master.gain.value = Math.max(0, Math.min(volume, 1))
  master.connect(context.destination)
  const step = chordSeconds(bpm, beatsPerChord)
  let timer: number | undefined
  let stopped = false

  const tick = (index: number) => {
    if (stopped) return
    if (index >= chordNotes.length) {
      if (!loop) {
        finish()
        return
      }
      index = 0
    }
    playChordNotes(chordNotes[index], context.currentTime + 0.02, context, Math.min(step * 0.92, 2.4), master)
    onStep?.(index)
    timer = window.setTimeout(() => tick(index + 1), step * 1000)
  }

  const finish = () => {
    stopped = true
    window.clearTimeout(timer)
    master.gain.setTargetAtTime(0, context.currentTime, 0.05)
    window.setTimeout(() => master.disconnect(), 400)
    onStep?.(null)
  }

  tick(0)
  return { stop: () => !stopped && finish() }
}
