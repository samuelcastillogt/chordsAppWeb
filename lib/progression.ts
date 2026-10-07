/** Returns a copy of `items` with the element at `from` moved to `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items
  const target = Math.max(0, Math.min(to, items.length - 1))
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

/** Positions where two progressions differ (including extra chords in the longer one). */
export function changedIndices(a: string[], b: string[]): number[] {
  const length = Math.max(a.length, b.length)
  return Array.from({ length }, (_, index) => index).filter(index => a[index] !== b[index])
}
