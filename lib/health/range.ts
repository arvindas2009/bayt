/**
 * Turns a lab result's reference range into positions for a range bar. Pure and model-free: it
 * only rescales the recorded value and range, it never judges them (the status word comes from
 * the record).
 *
 * Understands "a-b", "< x" / "<= x" and "> x" / ">= x" with one numeric value. Anything else
 * (blood pressure "135/85", text values) returns null and the caller shows the plain text row.
 */
export interface RangeScale {
  /** The reference band as fractions of the bar, 0..1 from the left. */
  band: [number, number]
  /** Where the recorded value sits, 0..1. */
  marker: number
}

const NUM = '(-?\\d+(?:\\.\\d+)?)'
const BETWEEN = new RegExp(`^${NUM}\\s*[-\\u2013]\\s*${NUM}$`)
const BELOW = new RegExp(`^<=?\\s*${NUM}$`)
const ABOVE = new RegExp(`^>=?\\s*${NUM}$`)

export function parseRange(referenceRange: string, value: string): RangeScale | null {
  if (value.includes('/') || referenceRange.includes('/')) return null
  const v = Number(value.trim())
  if (value.trim() === '' || !Number.isFinite(v)) return null

  const r = referenceRange.trim()
  let lo: number | null = null
  let hi: number | null = null
  const between = r.match(BETWEEN)
  const below = r.match(BELOW)
  const above = r.match(ABOVE)
  if (between) {
    lo = Number(between[1])
    hi = Number(between[2])
    if (hi <= lo) return null
  } else if (below) {
    hi = Number(below[1])
  } else if (above) {
    lo = Number(above[1])
  } else {
    return null
  }

  const known = [v, lo, hi].filter((n): n is number => n !== null)
  const min = Math.min(...known)
  const max = Math.max(...known)
  const span = Math.max(max - min, Math.abs(max) * 0.2, 1)
  // A non-negative measure starts at 0 when the range is open below or the padding would go negative.
  const dMin = min >= 0 ? Math.max(0, lo === null ? 0 : min - span * 0.25) : min - span * 0.25
  const dMax = max + span * 0.25
  const at = (x: number) => (x - dMin) / (dMax - dMin)

  return {
    band: [lo === null ? 0 : at(lo), hi === null ? 1 : at(hi)],
    marker: Math.min(Math.max(at(v), 0), 1),
  }
}
