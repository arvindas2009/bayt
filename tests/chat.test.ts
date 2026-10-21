import { describe, expect, it } from 'vitest'
import { buildCalendarEvents, buildObligations, FATIMA, mockFamily, SALEM } from '@/lib/data/mock-family'
import { buildFactSheet, isSensitive, sensitivePattern } from '@/lib/chat/facts'
import { matchFacts, stripFactIds } from '@/lib/chat/answer'
import { isFaithfulAnswer } from '@/lib/ai/guards'
import { computeLoad } from '@/lib/load/model'
import type { Family } from '@/types/family'

const TODAY = new Date()
const events = buildCalendarEvents(TODAY)
const family: Family = {
  ...mockFamily,
  members: mockFamily.members.map((m) => ({ ...m, calendarEvents: events.filter((e) => e.memberId === m.id) })),
  obligations: buildObligations(TODAY),
  handoffs: [],
}
const sheet = buildFactSheet(family, TODAY, SALEM, { hours: 3.5, lines: [{ label: 'Clashes caught', count: 2, minutes: 60 }] })

describe('chat fact sheet', () => {
  it('names no condition, medication, dose or lab result', () => {
    const text = sheet.text.toLowerCase()
    for (const m of family.members) {
      for (const c of m.healthProfile?.conditions ?? []) expect(text).not.toContain(c.toLowerCase())
      for (const med of m.medications) {
        expect(text).not.toContain(med.name.toLowerCase())
        expect(text).not.toContain(med.dosage.toLowerCase())
      }
      for (const lab of m.healthProfile?.lastLabResults ?? []) expect(text).not.toContain(lab.test.toLowerCase())
    }
    expect(isSensitive(sheet.text, sensitivePattern(family))).toBe(false)
  })

  it('renames health appointments wherever they are quoted', () => {
    const medical = events.filter((e) => ['medical', 'health'].includes(e.category))
    expect(medical.length).toBeGreaterThan(0)
    for (const e of medical) expect(sheet.text).not.toContain(e.title)
  })

  it('never shows an internal id', () => {
    expect(sheet.text).not.toMatch(/mem_/)
  })

  it('states the same load figures as the load model', () => {
    for (const m of computeLoad(family, TODAY).members) {
      const name = family.members.find((x) => x.id === m.memberId)!.name
      expect(sheet.text).toContain(`${name}'s load: ${m.hours} hours in the next 7 days, ${m.score}/100, ${m.shareOfLoad}%`)
    }
  })

  it('knows who is asking and numbers every fact', () => {
    expect(sheet.facts[0].text).toContain('The person asking is Salem')
    sheet.facts.forEach((f, i) => expect(f.id).toBe(`F${i + 1}`))
  })
})

describe('isFaithfulAnswer', () => {
  const facts = 'Fatima: 17.5 hours, 88/100. Pickup tomorrow at 09:30.'
  it('accepts figures that are on the sheet, including 9:30 for 09:30', () => {
    expect(isFaithfulAnswer('Fatima is at 88/100 with 17.5 hours; the pickup is at 9:30.', facts)).toBe(true)
  })
  it('rejects an invented figure, a ratio or a gendered pronoun', () => {
    expect(isFaithfulAnswer('Fatima is at 90/100.', facts)).toBe(false)
    expect(isFaithfulAnswer('Fatima carries twice as much as anyone.', facts)).toBe(false)
    expect(isFaithfulAnswer('She is over the line.', facts)).toBe(false)
  })
})

describe('matchFacts', () => {
  it('finds facts about a named person first', () => {
    const found = matchFacts('How is Fatima doing?', sheet, family.members)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((f) => f.memberIds.includes(FATIMA))).toBe(true)
  })
  it('matches "due" to obligations and "my" to the person asking', () => {
    expect(matchFacts('What is due soon?', sheet, family.members).some((f) => f.topic === 'obligation')).toBe(true)
    expect(matchFacts('What is due this week?', sheet, family.members)[0].topic).toBe('obligation')
    expect(matchFacts('How heavy is my load?', sheet, family.members)[0].memberIds).toContain(SALEM)
  })
  it('puts the absent person first in "what if" answers', () => {
    const [first] = matchFacts('What if Fatima is away?', sheet, family.members)
    expect(first.text).toMatch(/^If Fatima were away/)
    const mine = matchFacts('What if I am away?', sheet, family.members)
    expect(mine[0].text).toMatch(/^If Salem were away/)
    expect(mine.some((f) => f.text.startsWith('If Fatima were away'))).toBe(false)
  })

  it('returns nothing for a question it cannot place', () => {
    expect(matchFacts('xyzzy', sheet, family.members)).toEqual([])
  })
})

describe('stripFactIds', () => {
  it('removes inline citations without leaving stray punctuation', () => {
    expect(stripFactIds('Details are on the Load page, fact ids F1–F3.')).toBe('Details are on the Load page.')
    expect(stripFactIds('Salem is at 39/100 (F1, F4).')).toBe('Salem is at 39/100.')
    expect(stripFactIds('Fatima carries the most [F2].')).toBe('Fatima carries the most.')
    expect(stripFactIds('Friday at 5 on the fifth floor.')).toBe('Friday at 5 on the fifth floor.')
  })
})
