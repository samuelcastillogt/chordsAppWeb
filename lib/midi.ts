import { NOTE_OFFSETS } from "@/lib/music"

const TICKS_PER_BEAT = 480

/** MIDI note numbers for a chord: root in octave 3 as the bass, upper notes stacked upward from octave 4. */
export function voiceChord(notes: string[]): number[] {
  const voiced: number[] = []
  notes.forEach((note, index) => {
    const offset = NOTE_OFFSETS[note]
    if (offset === undefined) return
    let midi = 12 * ((index === 0 ? 3 : 4) + 1) + offset
    while (voiced.length > 1 && midi <= voiced[voiced.length - 1]) midi += 12
    voiced.push(midi)
  })
  return voiced
}

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f]
  let rest = value >> 7
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80)
    rest >>= 7
  }
  return bytes
}

function uint32(value: number) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

function ascii(text: string) {
  return Array.from(text, char => char.charCodeAt(0))
}

/** Standard MIDI file (format 0, piano) with one block chord per `beatsPerChord` beats. */
export function progressionToMidi(chordNotes: string[][], bpm = 100, beatsPerChord = 2) {
  const microsPerBeat = Math.round(60_000_000 / bpm)
  const length = TICKS_PER_BEAT * beatsPerChord
  const events: number[] = [
    0x00, 0xff, 0x51, 0x03, (microsPerBeat >> 16) & 0xff, (microsPerBeat >> 8) & 0xff, microsPerBeat & 0xff,
    0x00, 0xc0, 0x00,
  ]
  let pendingDelta = 0
  chordNotes.forEach(notes => {
    const voiced = voiceChord(notes)
    if (!voiced.length) {
      pendingDelta += length
      return
    }
    voiced.forEach((midi, index) => events.push(...variableLength(index === 0 ? pendingDelta : 0), 0x90, midi, 80))
    voiced.forEach((midi, index) => events.push(...variableLength(index === 0 ? length : 0), 0x80, midi, 0))
    pendingDelta = 0
  })
  events.push(...variableLength(pendingDelta), 0xff, 0x2f, 0x00)

  return new Uint8Array([
    ...ascii("MThd"), ...uint32(6), 0x00, 0x00, 0x00, 0x01, (TICKS_PER_BEAT >> 8) & 0xff, TICKS_PER_BEAT & 0xff,
    ...ascii("MTrk"), ...uint32(events.length), ...events,
  ])
}
