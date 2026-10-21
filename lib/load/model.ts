import { addDays, startOfDay } from 'date-fns'
import type { CalendarEvent, Family, FamilyMember, Handoff, Medication, Obligation, Recurrence } from '@/types/family'
import {
  BASELINE_WEEKLY_HOURS,
  BURNOUT_THRESHOLD,
  WEEKLY_CAPACITY_HOURS,
  referenceFor,
  type LoadCategory,
} from './reference-durations'

/**
 * The single source of truth for "how much invisible work does each person carry?".
 *
 * Pure and deterministic: same family + obligations + handoffs + date => same numbers. The
 * Caregiver score, Invisible Hours, burnout banner and the LoadField visual all read this, so
 * the app can never show two different answers.
 *
 * What counts as load: work done FOR the household or for someone else.
 *  - an event counts only when someone is explicitly responsible for it (ownerId set)
 *  - a medication counts when someone other than the patient administers it
 *  - an open obligation always counts for its owner
 * A care recipient who owns nothing therefore carries little, however much care they need.
 */

export const LOAD_WINDOW_DAYS = 7
/** How far back we look for the last rest block before reporting "30+". */
export const REST_LOOKBACK_DAYS = 30

export type LoadItemKind = 'event' | 'obligation' | 'medication'

export interface LoadItem {
  kind: LoadItemKind
  id: string
  title: string
  ownerId: string
  subjectId?: string
  backupIds: string[]
  category: LoadCategory
  /** Expected hours inside the load window. */
  hours: number
  /** Next occurrence / due moment, when known. */
  at?: string
  taskType: string
}

export interface MemberLoad {
  memberId: string
  hours: number
  /** 0–100: hours ÷ weekly capacity, clamped. */
  score: number
  /** Percent of the family's total hours this member carries. The only percentage the app may show. */
  shareOfLoad: number
  byCategory: Record<LoadCategory, number>
  /** Days since the last 'personal' block, capped at REST_LOOKBACK_DAYS. */
  daysWithoutRest: number
  itemCount: number
}

export interface LoadReport {
  windowStart: string
  windowEnd: string
  totalHours: number
  members: MemberLoad[]
  items: LoadItem[]
  /** Members at or above the burnout threshold. */
  atRiskIds: string[]
  /** Member carrying the most hours (null for an empty family). */
  topMemberId: string | null
  /** Percent above/below the baseline household figure. */
  comparisonToAverage: number
  pendingHandoffCount: number
}

export interface ComputeLoadOptions {
  /** Pretend these handoffs were accepted (used to preview the effect of a proposal). */
  assumeAccepted?: Handoff[]
}

const EMPTY_CATEGORIES = (): Record<LoadCategory, number> => ({
  medical: 0, school: 0, admin: 0, logistics: 0, meals: 0, social: 0,
})

const round1 = (n: number) => Math.round(n * 10) / 10

// ── Frequency parsing ────────────────────────────────────────────────────────────

/** Doses per week from free-text frequency such as "2x daily", "1x weekly", "PRN (as needed)". */
export function dosesPerWeek(frequency: string): number {
  const f = frequency.toLowerCase()
  if (/prn|as needed|emergency/.test(f)) return 0.5
  const n = Number(/(\d+)\s*x/.exec(f)?.[1] ?? 1)
  if (/week/.test(f)) return n
  if (/month/.test(f)) return n / 4.33
  return n * 7
}

const OCCURRENCES_PER_WEEK: Record<Recurrence, number> = {
  daily: 7,
  weekly: 1,
  monthly: 12 / 52,
  quarterly: 4 / 52,
  yearly: 1 / 52,
}

/** Derive a reference-duration key for a calendar event from its category and title. */
export function eventTaskType(event: Pick<CalendarEvent, 'category' | 'title'>): string {
  const cat = event.category.toLowerCase()
  const title = event.title.toLowerCase()
  if (cat === 'medical' || cat === 'caregiving') return 'appointment_escort'
  if (cat === 'health') return 'lab_visit'
  if (cat === 'education') {
    if (/pick-?up|drop-?off|school run/.test(title)) return 'school_run'
    if (/conference|meeting|parent/.test(title)) return 'school_meeting'
    return 'school_form'
  }
  if (cat === 'chores') return 'chores'
  if (cat === 'travel') return 'travel_support'
  if (/pick-?up|drop-?off|school run/.test(title)) return 'school_run'
  return 'errand'
}

// ── Item collection ──────────────────────────────────────────────────────────────

function eventItems(member: FamilyMember, from: Date, to: Date, owners: Map<string, string>): LoadItem[] {
  const out: LoadItem[] = []
  for (const e of member.calendarEvents) {
    const ownerId = owners.get(e.id) ?? e.ownerId
    if (!ownerId) continue // autonomous event: nobody is carrying it
    const d = new Date(e.date)
    if (d < from || d >= to) continue
    const taskType = eventTaskType(e)
    const ref = referenceFor(taskType)
    out.push({
      kind: 'event',
      id: e.id,
      title: e.title,
      ownerId,
      subjectId: e.memberId,
      backupIds: e.backupIds ?? [],
      category: ref.category,
      hours: ref.minutes / 60,
      at: e.date,
      taskType,
    })
  }
  return out
}

function medicationItems(member: FamilyMember, owners: Map<string, string>): LoadItem[] {
  const out: LoadItem[] = []
  for (const m of member.medications as Medication[]) {
    const ownerId = owners.get(m.id) ?? m.ownerId ?? m.memberId
    if (ownerId === m.memberId) continue // self-managed: not household load
    const ref = referenceFor('medication_dose')
    out.push({
      kind: 'medication',
      id: m.id,
      title: `${m.name} (${m.frequency})`,
      ownerId,
      subjectId: m.memberId,
      backupIds: m.backupIds ?? [],
      category: ref.category,
      hours: (dosesPerWeek(m.frequency) * ref.minutes) / 60,
      taskType: 'medication_dose',
    })
  }
  return out
}

function obligationItems(obligations: Obligation[], today: Date, to: Date, owners: Map<string, string>): LoadItem[] {
  const out: LoadItem[] = []
  for (const o of obligations) {
    if (o.status !== 'open') continue
    const ref = referenceFor(o.taskType)
    let hours: number
    if (o.recurrence) {
      hours = (ref.minutes * OCCURRENCES_PER_WEEK[o.recurrence]) / 60
    } else {
      // One-off: it weighs on its owner once it enters the lead window (or is already overdue).
      const activeFrom = addDays(new Date(o.dueDate), -Math.max(o.leadTimeDays, LOAD_WINDOW_DAYS))
      if (activeFrom >= to) continue
      hours = ref.minutes / 60
    }
    out.push({
      kind: 'obligation',
      id: o.id,
      title: o.title,
      ownerId: owners.get(o.id) ?? o.ownerId,
      subjectId: o.subjectId,
      backupIds: o.backupIds,
      category: ref.category,
      hours,
      at: o.dueDate,
      taskType: o.taskType,
    })
  }
  void today
  return out
}

export function daysSinceRest(member: FamilyMember, today: Date): number {
  const start = startOfDay(today)
  let latest: Date | null = null
  for (const e of member.calendarEvents) {
    if (e.category.toLowerCase() !== 'personal') continue
    const d = new Date(e.date)
    if (d > addDays(start, 1)) continue
    if (!latest || d > latest) latest = d
  }
  if (!latest) return REST_LOOKBACK_DAYS
  const days = Math.round((start.getTime() - startOfDay(latest).getTime()) / 86_400_000)
  return Math.min(Math.max(days, 0), REST_LOOKBACK_DAYS)
}

// ── Public API ───────────────────────────────────────────────────────────────────

export function computeLoad(
  family: Pick<Family, 'members'> & { obligations?: Obligation[]; handoffs?: Handoff[] },
  today: Date,
  options: ComputeLoadOptions = {},
): LoadReport {
  const from = startOfDay(today)
  const to = addDays(from, LOAD_WINDOW_DAYS)

  const owners = new Map<string, string>()
  for (const h of options.assumeAccepted ?? []) owners.set(h.itemId, h.toId)

  const items: LoadItem[] = [
    ...family.members.flatMap((m) => eventItems(m, from, to, owners)),
    ...family.members.flatMap((m) => medicationItems(m, owners)),
    ...obligationItems(family.obligations ?? [], today, to, owners),
  ]

  const totalHours = items.reduce((sum, i) => sum + i.hours, 0)

  const members: MemberLoad[] = family.members.map((m) => {
    const mine = items.filter((i) => i.ownerId === m.id)
    const byCategory = EMPTY_CATEGORIES()
    for (const i of mine) byCategory[i.category] += i.hours
    const hours = mine.reduce((s, i) => s + i.hours, 0)
    return {
      memberId: m.id,
      hours: round1(hours),
      score: Math.min(100, Math.round((hours / WEEKLY_CAPACITY_HOURS) * 100)),
      shareOfLoad: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, round1(v)]),
      ) as Record<LoadCategory, number>,
      daysWithoutRest: daysSinceRest(m, today),
      itemCount: mine.length,
    }
  })

  const top = [...members].sort((a, b) => b.hours - a.hours)[0]

  return {
    windowStart: from.toISOString(),
    windowEnd: to.toISOString(),
    totalHours: round1(totalHours),
    members,
    items,
    atRiskIds: members.filter((m) => m.score >= BURNOUT_THRESHOLD).map((m) => m.memberId),
    topMemberId: top && top.hours > 0 ? top.memberId : null,
    comparisonToAverage: Math.round(((totalHours - BASELINE_WEEKLY_HOURS) / BASELINE_WEEKLY_HOURS) * 100),
    pendingHandoffCount: (family.handoffs ?? []).filter((h) => h.status === 'pending').length,
  }
}

export function memberLoad(report: LoadReport, memberId: string): MemberLoad | undefined {
  return report.members.find((m) => m.memberId === memberId)
}
