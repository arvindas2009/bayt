import { describe, expect, it } from 'vitest'
import { parseRange } from '@/lib/health/range'

const inside = (r: { band: [number, number]; marker: number }) => r.marker >= r.band[0] && r.marker <= r.band[1]

describe('parseRange', () => {
  it('places a low value left of an a-b band', () => {
    const r = parseRange('30-100', '19')!
    expect(r).not.toBeNull()
    expect(r.marker).toBeLessThan(r.band[0])
    expect(r.band[1]).toBeLessThan(1)
  })

  it('places a value inside its band', () => {
    expect(inside(parseRange('10-90', '15')!)).toBe(true)
  })

  it('handles an upper limit, starting the bar at zero', () => {
    const r = parseRange('< 5.7', '6.8')!
    expect(r.band[0]).toBe(0)
    expect(r.marker).toBeGreaterThan(r.band[1])
  })

  it('handles a negative lower limit', () => {
    const r = parseRange('> -1.0', '-2.8')!
    expect(r.band[1]).toBe(1)
    expect(r.marker).toBeLessThan(r.band[0])
  })

  it('keeps every position on the bar', () => {
    for (const [range, value] of [['15-150', '18'], ['< 5.7', '6.8'], ['> -1.0', '-2.8'], ['30-100', '19']]) {
      const r = parseRange(range, value)!
      for (const x of [...r.band, r.marker]) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(1)
      }
    }
  })

  it('returns null for values it cannot scale', () => {
    expect(parseRange('< 120/80', '135/85')).toBeNull()
    expect(parseRange('negative', 'positive')).toBeNull()
    expect(parseRange('100-30', '50')).toBeNull()
    expect(parseRange('30-100', '')).toBeNull()
  })
})
