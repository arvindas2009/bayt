import { addDays, differenceInCalendarDays, format, isSameDay, startOfDay } from 'date-fns'
import type { CalendarEvent, Family, FamilyMember } from '@/types/family'

/**
 * Deterministic calendar-conflict detection. Whether two commitments clash is a fact about the
 * data, not something to ask a language model, so the Operations agent, the priority ranker and
 * the briefing all share this one implementation.
 */

/** Window for events a person already flagged as clashing (they know the true durations). */
export const CONFLICT_WINDOW_MIN = 90
/** Tighter window for clashes we infer ourselves from "same responsible person, same time". */
export const OVERLAP_WINDOW_MIN = 60

const responsibleFor = (e: CalendarEvent) => e.ownerId ?? e.memberId

export interface ConflictCluster {
  id: string
  /** One event (a self-flagged clash) or two overlapping ones. */
  events: CalendarEvent[]
  /** The event best candidate for reassignment. */
  movable: CalendarEvent
  /** A listed backup of `movable` who has nothing booked near that time. */
  substitute?: FamilyMember
  /** People on the hook for the events, most responsible first. */
  responsibleIds: string[]
  /** True when the same person is responsible for both events, so they truly cannot do both. */
  sameOwner: boolean
  daysUntil: number
  at: string
}

export const hhmm = (iso: string) => format(new Date(iso), 'HH:mm')

export const nameOf = (members: FamilyMember[], id: string | undefined) =>
  members.find((m) => m.id === id)?.name ?? 'Someone'

export function whenLabel(iso: string, today: Date): string {
  const d = new Date(iso)
  const diff = differenceInCalendarDays(d, today)
  if (diff === 0) return `today at ${hhmm(iso)}`
  if (diff === 1) return `tomorrow at ${hhmm(iso)}`
  if (diff > 1 && diff < 7) return `${format(d, 'EEEE')} at ${hhmm(iso)}`
  return `${format(d, 'EEE d MMM')} at ${hhmm(iso)}`
}

/** Who could take `event` instead: a listed backup with nothing booked near that time. */
export function freeBackup(event: CalendarEvent, family: Pick<Family, 'members'>): FamilyMember | undefined {
  const at = new Date(event.date).getTime()
  const everyEvent = family.members.flatMap((m) => m.calendarEvents)
  return event.backupIds
    ?.map((id) => family.members.find((m) => m.id === id))
    .find((m) => {
      if (!m) return false
      // Busy means it is their own event or one they are responsible for (e.g. a school pickup).
      return !everyEvent.some(
        (e) =>
          e.id !== event.id &&
          (e.memberId === m.id || e.ownerId === m.id) &&
          Math.abs(new Date(e.date).getTime() - at) <= CONFLICT_WINDOW_MIN * 60_000,
      )
    })
}

export function detectConflicts(family: Pick<Family, 'members'>, today: Date, horizonDays = 8): ConflictCluster[] {
  const from = startOfDay(today)
  const to = addDays(from, horizonDays)

  const upcoming = family.members
    .flatMap((m) => m.calendarEvents)
    .filter((e) => new Date(e.date) >= from && new Date(e.date) < to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

  const gapMin = (a: CalendarEvent, b: CalendarEvent) =>
    Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) / 60_000
  const sameDay = (a: CalendarEvent, b: CalendarEvent) => isSameDay(new Date(a.date), new Date(b.date))

  // Pairs of events that clash, found two ways: flagged by the family, or inferred (the same person
  // is responsible for both and they start close together). A set keeps each pair once.
  const pairs: [CalendarEvent, CalendarEvent | null][] = []
  const used = new Set<string>()

  for (const a of upcoming) {
    if (used.has(a.id)) continue

    const inferred = upcoming.find(
      (b) =>
        b.id !== a.id &&
        !used.has(b.id) &&
        b.title !== a.title &&
        sameDay(a, b) &&
        gapMin(a, b) <= OVERLAP_WINDOW_MIN &&
        responsibleFor(a) === responsibleFor(b),
    )
    const flagged = a.conflict
      ? upcoming.find(
          (b) => b.id !== a.id && !used.has(b.id) && b.conflict && sameDay(a, b) && gapMin(a, b) <= CONFLICT_WINDOW_MIN,
        )
      : undefined

    const partner = flagged ?? inferred
    if (partner) {
      pairs.push([a, partner])
      used.add(a.id)
      used.add(partner.id)
    } else if (a.conflict) {
      pairs.push([a, null])
      used.add(a.id)
    }
  }

  return pairs.map(([a, b]) => {
    const respA = responsibleFor(a)
    const respB = b ? responsibleFor(b) : undefined

    // Prefer to move the event whose owner can be replaced.
    const movable = b && freeBackup(b, family) ? b : freeBackup(a, family) ? a : (b ?? a)

    return {
      id: `conflict:${a.id}`,
      events: b ? [a, b] : [a],
      movable,
      substitute: freeBackup(movable, family),
      responsibleIds: [respA, ...(respB && respB !== respA ? [respB] : [])],
      sameOwner: Boolean(b && respA === respB),
      daysUntil: differenceInCalendarDays(new Date(a.date), today),
      at: a.date,
    }
  })
}

/** Plain-language description and suggestion for a cluster. */
export function describeConflict(c: ConflictCluster, family: Pick<Family, 'members'>, today: Date): { conflict: string; suggestion: string } {
  const [a, b] = c.events
  const responsibleName = nameOf(family.members, c.responsibleIds[0])

  let conflict: string
  if (!b) {
    conflict = `"${a.title}" (${whenLabel(a.date, today)}) clashes with another commitment`
  } else if (c.sameOwner) {
    // One person on the hook for two things at once reads best as exactly that.
    conflict = `${responsibleName} is responsible for both "${a.title}" (${whenLabel(a.date, today)}) and "${b.title}" (${hhmm(b.date)})`
  } else {
    conflict = `${nameOf(family.members, a.memberId)}'s "${a.title}" (${whenLabel(a.date, today)}) overlaps ${nameOf(family.members, b.memberId)}'s "${b.title}" (${hhmm(b.date)})`
  }

  let suggestion: string
  if (c.substitute) {
    suggestion = `Ask ${c.substitute.name} to take "${c.movable.title}": nothing else is booked for ${c.substitute.name} then.`
  } else if (b && c.sameOwner) {
    // Nobody free to cover: the honest options are to move one or find someone outside the usual backups.
    suggestion = `Nobody listed as a backup is free. Reschedule one of them, or find someone to cover "${c.movable.title}".`
  } else if (b) {
    suggestion = `Talk it through: "${c.movable.title}" could move or be shortened so both can happen.`
  } else {
    suggestion = `Decide who takes "${c.movable.title}" before ${whenLabel(a.date, today)}.`
  }

  return { conflict, suggestion }
}
