import { describe, expect, it } from 'vitest'
import { findDate } from '@/lib/ingest/extract'
import { arabicKeepsFacts, isFaithfulRewrite, isFaithfulNarrative, keepsNumbers } from '@/lib/ai/guards'
import { getCulturalContext } from '@/lib/utils/cultural-context'
import { deriveConstraints, isCompliant, isHalal, violationFor } from '@/lib/meals/constraints'
import { buildFallbackPlan } from '@/lib/meals/fallback-plan'
import { validatePlan, planCoversEveryone } from '@/lib/meals/validate'
import { readEnvStatus } from '@/lib/env'
import { getToday, setSimDate, getSimDate } from '@/lib/time/today'

const d = (iso: string) => new Date(`${iso}T12:00:00`)

describe('findDate', () => {
  const today = d('2026-10-15')
  it('reads ISO, day-month and month-day forms', () => {
    expect(findDate('Fees due 2026-11-30', today)).toBe('2026-11-30')
    expect(findDate('Return the form by 5 December', today)).toBe('2026-12-05')
    expect(findDate('Meeting on March 3, 2027', today)).toBe('2027-03-03')
  })
  it('rolls a past day-month to next year and rejects impossible dates', () => {
    expect(findDate('Open day 2 January', today)).toBe('2027-01-02')
    expect(findDate('Due 31 February', today)).toBeNull()
    expect(findDate('no date here', today)).toBeNull()
  })
})

describe('AI guards', () => {
  it('keeps and rejects numbers in rewrites', () => {
    expect(keepsNumbers('Pay 500 AED by 30 Nov', 'Please pay 500 AED by 30 Nov')).toBe(true)
    expect(isFaithfulRewrite('Pay 500 AED', 'Pay 600 AED')).toBe(false)
    expect(isFaithfulNarrative('Load is double the next person', '2.2x')).toBe(false)
  })
  it('lets Arabic spell a time out but not invent a figure', () => {
    const src = 'Medication reminder at 9:00'
    expect(arabicKeepsFacts(src, 'تذكير الدواء الساعة التاسعة')).toBe(true)
    expect(arabicKeepsFacts(src, 'تذكير الدواء الساعة ٩:٠٠')).toBe(true)
    expect(arabicKeepsFacts(src, 'تذكير الدواء الساعة 7')).toBe(false)
  })
})

describe('cultural context', () => {
  it('detects Ramadan, dust season and summer heat on fixed dates', () => {
    expect(getCulturalContext(d('2027-02-12')).activeSeasons).toContain('ramadan')
    expect(getCulturalContext(d('2026-11-05')).activeSeasons).toContain('dust_season')
    expect(getCulturalContext(d('2027-07-15')).activeSeasons).toContain('summer_heat')
    expect(getCulturalContext(d('2027-02-12')).mealPlanningMode).not.toBe('standard')
  })
  it('flags dates beyond the calendar', () => {
    expect(getCulturalContext(d('2030-01-01')).calendarCovered).toBe(false)
  })
})

describe('meal constraints and validator', () => {
  const member = (id: string, dietaryNeeds: string[], conditions: string[] = []) =>
    ({ id, name: id, dietaryNeeds, healthProfile: { conditions } }) as never

  it('derives constraints from needs and conditions', () => {
    expect(deriveConstraints(member('a', ['Vegetarian']))).toContain('vegetarian')
    expect(deriveConstraints(member('b', [], ['Type 2 diabetes']))).toContain('low_glycemic')
  })
  it('trusts specific free-from labels but not bare claims', () => {
    expect(violationFor({ name: 'Rice', ingredients: ['gluten-free flour'] }, 'gluten_free')).toBeNull()
    expect(violationFor({ name: 'Gluten-free bread', ingredients: ['wheat'] }, 'gluten_free')).not.toBeNull()
    expect(isHalal({ name: 'Pork sausage' })).toBe(false)
    expect(isCompliant({ name: 'Lentil soup', ingredients: ['lentils'] }, ['vegetarian'])).toBe(true)
  })
  it('builds a fallback plan that covers every member', () => {
    const members = [
      { memberId: 'a', name: 'a', constraints: ['vegetarian' as const] },
      { memberId: 'b', name: 'b', constraints: ['nut_free' as const, 'low_sodium' as const] },
    ]
    const report = buildFallbackPlan(members)
    expect(planCoversEveryone(report.plan, members)).toBe(true)
    expect(validatePlan(report.plan, members).replacedDishes).toHaveLength(0)
  })
})

describe('env check', () => {
  it('lists exactly what is missing', () => {
    const s = readEnvStatus({ DATABASE_URL: 'file:x', NVIDIA_API_KEY: 'k' })
    expect(s.hasGemini).toBe(false)
    expect(s.hasNvidia).toBe(true)
    expect(s.missing).toEqual(['GOOGLE_GENERATIVE_AI_API_KEY'])
    expect(readEnvStatus({}).missing).toHaveLength(3)
  })
})

describe('date simulator hook', () => {
  it('overrides getToday and restores it', () => {
    setSimDate('2027-02-12')
    expect(getToday().getFullYear()).toBe(2027)
    setSimDate(null)
    expect(getSimDate()).toBeNull()
  })
})
