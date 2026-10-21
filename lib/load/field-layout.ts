import type { FamilyMember } from '@/types/family'
import type { MemberLoad } from '@/lib/load/model'
import { memberColorAt } from '@/lib/design/members'

/** What the LoadField visual needs to draw one person. */
export interface FieldBody {
  id: string
  /** Anchor in 0..1, measured from the top-left of the field. */
  x: number
  y: number
  /** 0..1, the member's load score / 100. */
  load: number
  color: string
  label: string
  /** Short secondary line, e.g. "14.5 h". */
  detail?: string
}

export type LoadFigures = Pick<MemberLoad, 'memberId' | 'hours' | 'score' | 'shareOfLoad'>

/** Gentle radius variation so five bodies do not read as a regular pentagon. */
const RING_SCALE = [1, 0.82, 1, 0.9, 0.96, 0.85, 1, 0.9]

/**
 * Anchor positions for n bodies. Deterministic from the member order, so a family always gets the
 * same arrangement and a handoff animates between stable points.
 */
export function fieldAnchors(n: number): { x: number; y: number }[] {
  if (n <= 0) return []
  if (n === 1) return [{ x: 0.5, y: 0.5 }]
  if (n === 2) return [{ x: 0.34, y: 0.5 }, { x: 0.66, y: 0.5 }]
  const start = -Math.PI / 2 - 0.35
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i / n) * Math.PI * 2
    const s = RING_SCALE[i % RING_SCALE.length]
    return { x: 0.5 + 0.3 * s * Math.cos(a), y: 0.5 + 0.27 * s * Math.sin(a) }
  })
}

/** Build the bodies for a family from the single load model's numbers. */
export function buildFieldBodies(members: Pick<FamilyMember, 'id' | 'name'>[], figures: LoadFigures[]): FieldBody[] {
  const anchors = fieldAnchors(members.length)
  return members.map((m, i) => {
    const f = figures.find((x) => x.memberId === m.id)
    return {
      id: m.id,
      x: anchors[i].x,
      y: anchors[i].y,
      load: Math.min(Math.max((f?.score ?? 0) / 100, 0), 1),
      color: memberColorAt(i),
      label: m.name,
      detail: f ? `${f.hours} h` : undefined,
    }
  })
}

/** Canvas-height units. Quiet members stay visible, overloaded ones dominate. */
export function bodyRadius(load01: number): number {
  return 0.06 + 0.15 * Math.pow(Math.min(Math.max(load01, 0), 1), 0.85)
}

/** The sentence a screen reader gets in place of the canvas. */
export function describeField(members: Pick<FamilyMember, 'id' | 'name'>[], figures: LoadFigures[]): string {
  const withLoad = figures.filter((f) => f.hours > 0)
  if (!withLoad.length) return 'No household load is assigned this week.'
  const top = [...withLoad].sort((a, b) => b.hours - a.hours)[0]
  const name = members.find((m) => m.id === top.memberId)?.name ?? 'Someone'
  return `${name} carries ${top.shareOfLoad}% of this week's household load (${top.hours} hours).`
}
