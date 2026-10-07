/**
 * The mandala "recorrido": every chord the user picks, in order. Picking never unmarks a
 * chord already in it, so the walk stays visible while recommendations follow the newest step.
 */

/** Adds `chord` as the newest step (clicking the current chord again is not a new step). */
export function pushStep(trail: string[], chord: string): string[] {
  return trail[trail.length - 1] === chord ? trail : [...trail, chord]
}

/** Removes the newest step. */
export function undoStep(trail: string[]): string[] {
  return trail.slice(0, -1)
}

/** Chords that give context to the next suggestion: the walk, ending on the current chord. */
export function trailContext(trail: string[], current: string, size = 4): string[] {
  const walk = trail[trail.length - 1] === current ? trail : [...trail, current]
  return walk.slice(-size)
}

/** 1-based positions of each chord in the walk ("C" → [1, 4] for C G Am C). */
export function stepsByChord(trail: string[], toNode: (chord: string) => string = chord => chord): Map<string, number[]> {
  const steps = new Map<string, number[]>()
  trail.forEach((chord, index) => {
    const id = toNode(chord)
    steps.set(id, [...(steps.get(id) ?? []), index + 1])
  })
  return steps
}
