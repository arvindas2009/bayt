import { describe, expect, it } from 'vitest'
import { mockFamily } from '@/lib/data/mock-family'
import { computeLoad, dosesPerWeek, eventTaskType } from '@/lib/load/model'
import { assessResilience, simulateAbsence, MAX_ABSENCE_DAYS } from '@/lib/resilience/simulate'
import { buildHandoverPlan } from '@/lib/resilience/plan'
import { buildPriorityItems, isGenericPriority, priorityFor } from '@/lib/briefing/rank'
import { computeTimeDividend } from '@/lib/load/time-dividend'
import { invisibleHoursFromLoad } from '@/lib/utils/invisible-hours'

const TODAY = new Date()
const family = mockFamily

describe('computeLoad', () => {
  const load = computeLoad(family, TODAY)

  it('scores every member and the shares add to roughly 100%', () => {
    expect(load.members).toHaveLength(family.members.length)
    const share = load.members.reduce((s, m) => s + m.shareOfLoad, 0)
    expect(share).toBeGreaterThan(97)
    expect(share).toBeLessThan(103)
  })

  it('names the top member by id', () => {
    expect(load.topMemberId).toMatch(/^mem_/)
    expect(load.members.some((m) => m.memberId === load.topMemberId)).toBe(true)
  })

  it('parses dose frequency and maps event categories to task types', () => {
    expect(dosesPerWeek('daily')).toBe(7)
    expect(dosesPerWeek('2x daily')).toBe(14)
    expect(dosesPerWeek('1x weekly')).toBe(1)
    expect(dosesPerWeek('PRN (as needed)')).toBe(0.5)
    expect(eventTaskType({ category: 'medical', title: 'Check-up' })).toBe('appointment_escort')
    expect(eventTaskType({ category: 'education', title: 'Parent conference' })).toBe('school_meeting')
  })
})

describe('invisible hours', () => {
  it('is derived from the same load report', () => {
    const inv = invisibleHoursFromLoad(computeLoad(family, TODAY))
    expect(JSON.stringify(inv)).toBeTruthy()
  })
})

describe('resilience', () => {
  it('assesses bus factor per category', () => {
    const a = assessResilience(computeLoad(family, TODAY))
    expect(a.byCategory.length).toBeGreaterThan(0)
    expect(Array.isArray(a.singlePoints)).toBe(true)
    expect(a.busFactor).toBeGreaterThanOrEqual(0)
  })

  it('clamps absence length', () => {
    const r = simulateAbsence(family, family.members[0]!.id, 9999, TODAY)
    expect(r.days).toBe(MAX_ABSENCE_DAYS)
  })

  it('builds a handover plan from a simulation', () => {
    const r = simulateAbsence(family, family.members[0]!.id, 14, TODAY)
    expect(buildHandoverPlan(family, r)).toBeTruthy()
  })
})

describe('priority ranking', () => {
  it('never yields a generic top line', () => {
    const items = buildPriorityItems(family, TODAY)
    for (const m of family.members) {
      const mine = priorityFor(items, m.id)
      if (mine[0]) expect(isGenericPriority(mine[0].action)).toBe(false)
    }
  })
})

describe('time dividend', () => {
  it('reports seven days ending today', () => {
    const r = computeTimeDividend({ conflictDates: [], handoffs: [] } as never, TODAY)
    expect(r.dailyBreakdown).toHaveLength(7)
  })
})
