import { addDays, startOfDay } from 'date-fns'
import type { CalendarEvent, FamilyMember } from '@/types'

export const APPOINTMENT_DAYS = 21

export type Appointment = CalendarEvent & { who: string }

/** Medical and health events from today through the next `days` days, soonest first. */
export function upcomingAppointments(members: FamilyMember[], today: Date, days = APPOINTMENT_DAYS): Appointment[] {
  const from = startOfDay(today)
  const to = addDays(from, days)
  return members
    .flatMap((m) => m.calendarEvents.map((e) => ({ ...e, who: m.id })))
    .filter((e) => ['medical', 'health'].includes(e.category) && new Date(e.date) >= from && new Date(e.date) <= to)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/** Medications whose giver is not the patient and who have no one else set up to give them. */
export function unbackedCount(members: FamilyMember[]): number {
  return members
    .flatMap((m) => m.medications)
    .filter((m) => {
      const giver = m.ownerId ?? m.memberId
      return giver !== m.memberId && (m.backupIds ?? []).filter((id) => id !== giver).length === 0
    }).length
}
