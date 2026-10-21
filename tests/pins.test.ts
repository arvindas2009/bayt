import { describe, expect, it } from 'vitest'
import { movePin, togglePin } from '@/store/pin-store'
import { upcomingAppointments, unbackedCount } from '@/lib/health/appointments'
import type { FamilyMember } from '@/types'

describe('pins', () => {
  it('toggles a feature on and off, keeping the order of the rest', () => {
    const a = togglePin([], 'clashes')
    const b = togglePin(a, 'drop')
    expect(b).toEqual(['clashes', 'drop'])
    expect(togglePin(b, 'clashes')).toEqual(['drop'])
  })

  it('moves a pin, clamping the position', () => {
    expect(movePin(['clashes', 'drop', 'school'], 'school', 0)).toEqual(['school', 'clashes', 'drop'])
    expect(movePin(['clashes', 'drop'], 'clashes', 99)).toEqual(['drop', 'clashes'])
    expect(movePin(['clashes'], 'drop', 0)).toEqual(['clashes'])
  })
})

const member = (id: string, extra: Partial<FamilyMember> = {}): FamilyMember => ({
  id,
  name: id,
  role: 'parent',
  age: 40,
  avatarSeed: id,
  dietaryNeeds: [],
  medications: [],
  calendarEvents: [],
  ...extra,
})

describe('upcomingAppointments', () => {
  const today = new Date('2026-10-21T09:00:00')
  const ev = (id: string, date: string, category = 'medical') => ({ id, memberId: 'a', title: id, date, category, conflict: false })

  it('keeps medical events from today to the window end, soonest first', () => {
    const fam = [
      member('a', { calendarEvents: [ev('late', '2026-11-05T10:00:00'), ev('soon', '2026-10-21T08:00:00'), ev('past', '2026-10-20T10:00:00')] }),
      member('b', { calendarEvents: [ev('school', '2026-10-22T10:00:00', 'school'), ev('mid', '2026-10-25T10:00:00', 'health')] }),
    ]
    const out = upcomingAppointments(fam, today)
    expect(out.map((e) => e.id)).toEqual(['soon', 'mid', 'late'])
    expect(out.find((e) => e.id === 'mid')?.who).toBe('b')
    expect(upcomingAppointments(fam, today, 7).map((e) => e.id)).toEqual(['soon', 'mid'])
  })
})

describe('unbackedCount', () => {
  const med = (id: string, memberId: string, ownerId?: string, backupIds?: string[]) => ({ id, memberId, name: id, dosage: '', frequency: '', interactions: [], ownerId, backupIds })

  it('counts medications someone else gives with no backup', () => {
    const fam = [member('a', { medications: [med('self', 'a'), med('given', 'a', 'b'), med('covered', 'a', 'b', ['c']), med('only-giver', 'a', 'b', ['b'])] })]
    expect(unbackedCount(fam)).toBe(2)
  })
})
