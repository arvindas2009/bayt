import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from 'date-fns'
import type { CalendarEvent, Family, FamilyMember } from '@/types/family'
import type { SourceRef } from '@/types/agents'

/**
 * Relationship drift, computed from calendar evidence only.
 *
 * Bayt has no chat logs and does not want them. The only honest claim available is about SHARED
 * CALENDAR EVENTS ("no shared events in 9 days"), never about conversations or feelings, so that
 * is all this module ever says, and it always carries the events it is based on.
 *
 * Two members "shared" an event when both appear in it: the same activity on both calendars on the
 * same day, or one member is responsible (ownerId) for an event on the other's calendar, such as
 * driving them to an appointment.
 */

export const DRIFT_LOOKBACK_DAYS = 30
/** Gap (days) at which a pair is worth mentioning. Doubled in Ramadan/Eid, when gaps are normal. */
export const DRIFT_THRESHOLD_DAYS = 7

export interface SharedEventRef {
  id: string
  title: string
  date: string
}

export interface PairDrift {
  /** Stable key, member ids sorted: "mem_a|mem_b". */
  key: string
  aId: string
  bId: string
  /** Whole days since the last shared event; null when none exists within the lookback. */
  daysSinceShared: number | null
  lastShared?: SharedEventRef
  /** Human sentence stating exactly what the data shows. */
  evidence: string
  sources: SourceRef[]
}

export const pairKey = (a: string, b: string) => [a, b].sort().join('|')

function sharedEvents(a: FamilyMember, b: FamilyMember, all: CalendarEvent[], now: Date): CalendarEvent[] {
  const earliest = addDays(startOfDay(now), -DRIFT_LOOKBACK_DAYS)
  const past = all.filter((e) => {
    const d = new Date(e.date)
    return d >= earliest && d <= now
  })

  const out: CalendarEvent[] = []
  for (const e of past) {
    // One is the subject, the other is responsible for it (escort, pickup, covering).
    const escort = (e.memberId === a.id && e.ownerId === b.id) || (e.memberId === b.id && e.ownerId === a.id)
    if (escort) {
      out.push(e)
      continue
    }
    // The same activity on both calendars on the same day.
    if (e.memberId === a.id) {
      const twin = past.find(
        (o) => o.memberId === b.id && o.title === e.title && isSameDay(new Date(o.date), new Date(e.date)),
      )
      if (twin) out.push(e)
    }
  }
  return out
}

export function computePairDrift(family: Pick<Family, 'members'>, now: Date): PairDrift[] {
  const all = family.members.flatMap((m) => m.calendarEvents)
  const pairs: PairDrift[] = []

  for (let i = 0; i < family.members.length; i++) {
    for (let j = i + 1; j < family.members.length; j++) {
      const a = family.members[i]
      const b = family.members[j]
      const shared = sharedEvents(a, b, all, now).sort((x, y) => y.date.localeCompare(x.date))
      const last = shared[0]
      const days = last ? differenceInCalendarDays(now, new Date(last.date)) : null

      const evidence = last
        ? days !== null && days < 2
          ? `Shared a calendar event ${days === 0 ? 'today' : 'yesterday'} ("${last.title}").`
          : `No shared calendar events in ${days} days (last: "${last.title}" on ${format(new Date(last.date), 'EEE d MMM')}).`
        : `No shared calendar events in the last ${DRIFT_LOOKBACK_DAYS} days.`

      pairs.push({
        key: pairKey(a.id, b.id),
        aId: a.id,
        bId: b.id,
        daysSinceShared: days,
        lastShared: last ? { id: last.id, title: last.title, date: last.date } : undefined,
        evidence,
        sources: shared.slice(0, 3).map((e) => ({ type: 'event' as const, id: e.id })),
      })
    }
  }
  return pairs
}

/** The pairs worth surfacing: longest gaps first, capped, thresholded for the season. */
export function selectDrift(pairs: PairDrift[], opts: { socialLevel: 'low' | 'medium' | 'high'; limit?: number }): PairDrift[] {
  const threshold = opts.socialLevel === 'high' ? DRIFT_THRESHOLD_DAYS * 2 : DRIFT_THRESHOLD_DAYS
  return pairs
    .filter((p) => (p.daysSinceShared ?? DRIFT_LOOKBACK_DAYS) >= threshold)
    .sort(
      (x, y) =>
        (y.daysSinceShared ?? DRIFT_LOOKBACK_DAYS) - (x.daysSinceShared ?? DRIFT_LOOKBACK_DAYS) ||
        x.key.localeCompare(y.key),
    )
    .slice(0, opts.limit ?? 3)
}

/**
 * The nearest upcoming day (from tomorrow, within a week) with no events for either member from
 * 17:00. Returned as a date, or null when both calendars are busy all week.
 */
export function nextFreeEvening(a: FamilyMember, b: FamilyMember, now: Date): Date | null {
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(startOfDay(now), offset)
    const busy = [a, b].some((m) =>
      m.calendarEvents.some((e) => {
        const d = new Date(e.date)
        return isSameDay(d, day) && d.getHours() >= 17
      }),
    )
    const evening = new Date(day)
    evening.setHours(19, 0, 0, 0)
    if (!busy && evening > now) return evening
  }
  return null
}
