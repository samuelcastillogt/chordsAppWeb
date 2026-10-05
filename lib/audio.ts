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
export function playChordNotes(notes: string[], startAt: number, context: AudioContext, duration = 0.9) {
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
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt + offset)
    oscillator.stop(startAt + duration + 0.05)
  })
}

/** Plays a sequence of chords and reports the index currently sounding. */
export function playSequence(chordNotes: string[][], onStep?: (index: number | null) => void, beat = 1.05) {
  const context = getAudioContext()
  if (!context) return
  chordNotes.forEach((notes, index) => {
    playChordNotes(notes, context.currentTime + index * beat, context)
    if (onStep) window.setTimeout(() => onStep(index), index * beat * 1000)
  })
  if (onStep) window.setTimeout(() => onStep(null), chordNotes.length * beat * 1000)
}
