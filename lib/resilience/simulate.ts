import { addDays, addMonths, startOfDay } from 'date-fns'
import type { Family, Obligation } from '@/types/family'
import type { SourceRef } from '@/types/agents'
import { computeLoad, dosesPerWeek, eventTaskType, type LoadItem, type LoadItemKind, type LoadReport } from '@/lib/load/model'
import { LOAD_CATEGORY_LABELS, referenceFor, type LoadCategory } from '@/lib/load/reference-durations'
import { daysBetween, getToday } from '@/lib/time/today'

/**
 * Resilience Mode: "what breaks if this person is not here?". Pure and deterministic.
 *
 * Two questions, both answered from the same records the load model reads:
 *  - STRUCTURE (`assessResilience`): how many people can do each task? A task nobody else can do
 *    is a single point of failure; the bus factor is the smallest number of people any task depends on.
 *  - STRESS TEST (`simulateAbsence`): walk the next N days, find every task that falls to the absent
 *    member, and sort them into "a named backup steps in" and "nobody can do it".
 *
 * Nothing here is written by a model. A backup counts only when someone listed it as one.
 */

export const MIN_ABSENCE_DAYS = 1
export const MAX_ABSENCE_DAYS = 60

export type FailureSeverity = 'critical' | 'high' | 'medium'

/** One task occurring on one day. Repeats of one job share a `key`. */
interface Duty {
  kind: LoadItemKind
  id: string
  key: string
  title: string
  ownerId: string
  subjectId?: string
  backupIds: string[]
  category: LoadCategory
  taskType: string
  /** 0 = today. */
  day: number
  /** True when only "by this day at the latest" is known (a weekly dose has no fixed weekday). */
  approximate: boolean
  /** An on-hand item (rescue medication) rather than a scheduled job: it fails from day one. */
  standby: boolean
  /** Times the work is done in this occurrence (doses for a medication, otherwise 1). */
  units: number
  consequence: string
}

export interface Failure {
  key: string
  kind: LoadItemKind
  /** Every record behind this job (one per occurrence for repeating events). */
  itemIds: string[]
  title: string
  ownerId: string
  subjectId?: string
  category: LoadCategory
  /** Key into the reference durations (what kind of job this is). */
  taskType: string
  /** First day (0 = today) it goes unattended. */
  day: number
  approximate: boolean
  standby: boolean
  occurrences: number
  consequence: string
  severity: FailureSeverity
  /** Hours of work this job needs during the absence, from the reference durations. */
  hours: number
  /** The same job's share of a normal week in the load model (can be near zero for rare jobs). */
  weeklyHours: number
  sources: SourceRef[]
}

export interface Cover {
  key: string
  kind: LoadItemKind
  itemIds: string[]
  title: string
  ownerId: string
  coverId: string
  occurrences: number
}

export interface CoverLoad {
  memberId: string
  hoursBefore: number
  scoreBefore: number
  hoursAfter: number
  scoreAfter: number
}

export interface SinglePoint {
  key: string
  title: string
  ownerId: string
  kind: LoadItemKind
  category: LoadCategory
  sources: SourceRef[]
}

export interface CategoryResilience {
  category: LoadCategory
  label: string
  groups: number
  singlePoints: number
  /** Fewest people any task in this category depends on. */
  busFactor: number
}

export interface ResilienceAssessment {
  /** Fewest people any task depends on (1 = at least one task rests on a single person). 0 when there is no work. */
  busFactor: number
  groups: number
  singlePoints: SinglePoint[]
  byCategory: CategoryResilience[]
}

export interface AbsenceResult {
  absentId: string
  days: number
  /** ISO start of the simulated period. */
  from: string
  failures: Failure[]
  covered: Cover[]
  /** Load of every present member before and after their backups step in (7-day window). */
  coverLoad: CoverLoad[]
  /** Members who take on work while the absent member is away. */
  inheritorIds: string[]
  /** People the unattended tasks are about. */
  affectedIds: string[]
  resilience: ResilienceAssessment
  /** The absent member's own load score in a normal week (from the load model). */
  absentScore: number
  dutiesOwned: number
  /** Present when the calendar does not reach the whole period, so the count is a floor. */
  horizonNote?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

const STANDBY = /prn|as needed|emergency/i
const SEVERITY_RANK: Record<FailureSeverity, number> = { critical: 0, high: 1, medium: 2 }

const stepOf = (r: NonNullable<Obligation['recurrence']>): ((d: Date) => Date) => {
  switch (r) {
    case 'daily': return (d) => addDays(d, 1)
    case 'weekly': return (d) => addDays(d, 7)
    case 'monthly': return (d) => addMonths(d, 1)
    case 'quarterly': return (d) => addMonths(d, 3)
    case 'yearly': return (d) => addMonths(d, 12)
  }
}

/** Dates this obligation falls due inside [start, end). An overdue one-off counts as due today. */
function obligationDates(o: Obligation, start: Date, end: Date): Date[] {
  const first = new Date(o.dueDate)
  if (!o.recurrence) return first < end ? [first < start ? start : first] : []

  const step = stepOf(o.recurrence)
  const out: Date[] = []
  let d = first
  let guard = 0
  while (d < start && guard++ < 800) d = step(d)
  while (d < end && guard++ < 1600) {
    out.push(d)
    d = step(d)
  }
  return out
}

function collectDuties(family: Family, start: Date, days: number): Duty[] {
  const end = addDays(start, days)
  const duties: Duty[] = []

  for (const m of family.members) {
    for (const e of m.calendarEvents) {
      if (!e.ownerId) continue // nobody is carrying it
      const d = new Date(e.date)
      if (d < start || d >= end) continue
      const taskType = eventTaskType(e)
      duties.push({
        kind: 'event',
        id: e.id,
        key: `event|${e.ownerId}|${e.title}`,
        title: e.title,
        ownerId: e.ownerId,
        subjectId: e.memberId,
        backupIds: e.backupIds ?? [],
        category: referenceFor(taskType).category,
        taskType,
        day: daysBetween(start, d),
        approximate: false,
        standby: false,
        units: 1,
        consequence: 'Nobody is named to attend or drive, so it is missed or has to be cancelled.',
      })
    }

    for (const med of m.medications) {
      const ownerId = med.ownerId ?? med.memberId
      if (ownerId === med.memberId) continue // self-managed: not household work
      const standby = STANDBY.test(med.frequency)
      const interval = standby ? 0 : 7 / Math.max(dosesPerWeek(med.frequency), 0.01)
      const day = standby ? 0 : Math.max(0, Math.ceil(interval) - 1)
      if (day >= days) continue // the absence is shorter than the gap between doses
      duties.push({
        kind: 'medication',
        id: med.id,
        key: `medication|${med.id}`,
        title: `${med.name} (${med.frequency})`,
        ownerId,
        subjectId: med.memberId,
        backupIds: med.backupIds ?? [],
        category: 'medical',
        taskType: 'medication_dose',
        day,
        approximate: !standby && interval > 1,
        standby,
        units: standby ? 1 : Math.max(1, Math.round((dosesPerWeek(med.frequency) * days) / 7)),
        consequence: standby
          ? 'Nobody else is named to give it or to replace it if it is needed.'
          : 'Doses are not given until the owner is back.',
      })
    }
  }

  for (const o of family.obligations ?? []) {
    if (o.status !== 'open') continue
    for (const due of obligationDates(o, start, end)) {
      duties.push({
        kind: 'obligation',
        id: o.id,
        key: `obligation|${o.id}`,
        title: o.title,
        ownerId: o.ownerId,
        subjectId: o.subjectId,
        backupIds: o.backupIds,
        category: referenceFor(o.taskType).category,
        taskType: o.taskType,
        day: daysBetween(start, due),
        approximate: false,
        standby: false,
        units: 1,
        consequence: o.consequence,
      })
    }
  }

  return duties
}

const sourceKind = (k: LoadItemKind): SourceRef['type'] => k

const groupKey = (i: LoadItem) => (i.kind === 'event' ? `event|${i.ownerId}|${i.title}` : `${i.kind}|${i.id}`)

// ── Structure: bus factor ────────────────────────────────────────────────────────

/** How many people each job depends on, from this week's load items. */
export function assessResilience(report: LoadReport): ResilienceAssessment {
  const groups = new Map<string, LoadItem[]>()
  for (const i of report.items) {
    const k = groupKey(i)
    groups.set(k, [...(groups.get(k) ?? []), i])
  }

  const rows = [...groups.entries()].map(([key, items]) => {
    const first = items[0]
    const people = new Set([first.ownerId, ...items.flatMap((i) => i.backupIds)])
    return { key, first, items, people: people.size }
  })

  const singlePoints: SinglePoint[] = rows
    .filter((r) => r.people === 1)
    .map((r) => ({
      key: r.key,
      title: r.first.title,
      ownerId: r.first.ownerId,
      kind: r.first.kind,
      category: r.first.category,
      sources: r.items.slice(0, 3).map((i) => ({ type: sourceKind(i.kind), id: i.id })),
    }))

  const categories = [...new Set(rows.map((r) => r.first.category))]
  const byCategory: CategoryResilience[] = categories.map((category) => {
    const mine = rows.filter((r) => r.first.category === category)
    return {
      category,
      label: LOAD_CATEGORY_LABELS[category],
      groups: mine.length,
      singlePoints: mine.filter((r) => r.people === 1).length,
      busFactor: Math.min(...mine.map((r) => r.people)),
    }
  })

  return {
    busFactor: rows.length ? Math.min(...rows.map((r) => r.people)) : 0,
    groups: rows.length,
    singlePoints,
    byCategory: byCategory.sort((a, b) => a.busFactor - b.busFactor || b.singlePoints - a.singlePoints),
  }
}

// ── Stress test ──────────────────────────────────────────────────────────────────

export function simulateAbsence(
  family: Family,
  absentId: string,
  rawDays: number,
  today: Date = getToday(),
): AbsenceResult {
  const days = Math.min(Math.max(Math.round(rawDays) || MIN_ABSENCE_DAYS, MIN_ABSENCE_DAYS), MAX_ABSENCE_DAYS)
  const start = startOfDay(today)
  const report = computeLoad(family, today)
  const hoursOf = (id: string) => report.members.find((m) => m.memberId === id)?.hours ?? 0
  const itemHours = new Map(report.items.map((i) => [i.id, i.hours]))

  const owned = collectDuties(family, start, days).filter((d) => d.ownerId === absentId)

  type Bucket = { duties: Duty[]; coverId: string | null }
  const buckets = new Map<string, Bucket>()
  for (const d of owned) {
    const present = d.backupIds.filter((id) => id !== absentId && family.members.some((m) => m.id === id))
    const coverId = present.sort((a, b) => hoursOf(a) - hoursOf(b))[0] ?? null
    const b = buckets.get(d.key)
    if (b) b.duties.push(d)
    else buckets.set(d.key, { duties: [d], coverId })
  }

  const failures: Failure[] = []
  const covered: Cover[] = []
  for (const [key, { duties, coverId }] of buckets) {
    const first = duties.reduce((a, b) => (b.day < a.day ? b : a))
    const itemIds = [...new Set(duties.map((d) => d.id))]
    if (coverId) {
      covered.push({ key, kind: first.kind, itemIds, title: first.title, ownerId: absentId, coverId, occurrences: duties.length })
      continue
    }
    const ref = referenceFor(first.taskType)
    failures.push({
      key,
      kind: first.kind,
      itemIds,
      title: first.title,
      ownerId: absentId,
      subjectId: first.subjectId,
      category: first.category,
      taskType: first.taskType,
      day: first.day,
      approximate: first.approximate,
      standby: first.standby,
      occurrences: duties.length,
      consequence: first.consequence,
      severity: first.kind === 'medication' ? 'critical' : first.kind === 'obligation' ? 'high' : 'medium',
      hours: Math.round(duties.reduce((s, d) => s + d.units * (ref.minutes / 60), 0) * 10) / 10,
      weeklyHours: Math.round(itemIds.reduce((s, id) => s + (itemHours.get(id) ?? 0), 0) * 10) / 10,
      sources: itemIds.slice(0, 3).map((id) => ({ type: sourceKind(first.kind), id })),
    })
  }
  failures.sort((a, b) => a.day - b.day || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.title.localeCompare(b.title))

  // What the backups would carry: re-run the load model with their jobs moved across.
  const moved = covered.flatMap((c) => c.itemIds.map((itemId) => ({ itemId, toId: c.coverId, itemType: c.kind })))
  const after = computeLoad(family, today, {
    assumeAccepted: moved.map((m, n) => ({
      id: `stress:${n}`,
      familyId: family.id,
      fromId: absentId,
      toId: m.toId,
      itemType: m.itemType,
      itemId: m.itemId,
      itemTitle: '',
      reason: '',
      status: 'accepted' as const,
      createdAt: start.toISOString(),
    })),
  })
  const coverLoad: CoverLoad[] = report.members
    .filter((m) => m.memberId !== absentId)
    .map((m) => {
      const a = after.members.find((x) => x.memberId === m.memberId)
      return {
        memberId: m.memberId,
        hoursBefore: m.hours,
        scoreBefore: m.score,
        hoursAfter: a?.hours ?? m.hours,
        scoreAfter: a?.score ?? m.score,
      }
    })

  const eventDays = family.members
    .flatMap((m) => m.calendarEvents)
    .filter((e) => e.ownerId)
    .map((e) => daysBetween(start, new Date(e.date)))
  const knownDays = eventDays.length ? Math.max(...eventDays) + 1 : 0

  return {
    absentId,
    days,
    from: start.toISOString(),
    failures,
    covered,
    coverLoad,
    inheritorIds: [...new Set(covered.map((c) => c.coverId))],
    affectedIds: [...new Set(failures.map((f) => f.subjectId).filter((id): id is string => Boolean(id) && id !== absentId))],
    resilience: assessResilience(report),
    absentScore: report.members.find((m) => m.memberId === absentId)?.score ?? 0,
    dutiesOwned: buckets.size,
    horizonNote:
      knownDays > 0 && days > knownDays
        ? `The calendar only reaches ${knownDays} days ahead, so appointments after that are not counted.`
        : undefined,
  }
}
