/** Most chords the analysis endpoint accepts. */
export const MAX_ANALYZED_CHORDS = 64

/** Removes back-to-back repetitions of the same run: Am F C G Am F C G E7 → Am F C G E7. */
export function collapseRepeats(chords: string[]): string[] {
  const result = [...chords]
  let changed = true
  while (changed) {
    changed = false
    for (let start = 0; start < result.length && !changed; start++) {
      for (let size = 1; start + size * 2 <= result.length; size++) {
        const first = result.slice(start, start + size)
        const second = result.slice(start + size, start + size * 2)
        if (first.every((chord, index) => chord === second[index])) {
          result.splice(start + size, size)
          changed = true
          break
        }
      }
    }
  }
  return result
}

/**
 * The harmony of a whole song in few chords: sections that repeat an earlier one's chords
 * (second verse, last chorus) are skipped and repeated loops inside a section collapse.
 */
export function condenseSong(sections: Array<{ name: string; chords: string[] }>, limit = MAX_ANALYZED_CHORDS): string[] {
  const seen = new Set<string>()
  const chords: string[] = []
  for (const section of sections) {
    const compact = collapseRepeats(section.chords)
    const signature = compact.join(" ")
    if (!compact.length || seen.has(signature)) continue
    seen.add(signature)
    for (const chord of compact) {
      if (chords[chords.length - 1] !== chord) chords.push(chord)
    }
  }
  return collapseRepeats(chords).slice(0, limit)
}
