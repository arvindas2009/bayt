import { differenceInCalendarDays, format } from 'date-fns'
import type { Family, Handoff, Obligation } from '@/types/family'
import type { InsightSeverity, SourceRef } from '@/types/agents'
import { BURNOUT_THRESHOLD } from '@/lib/load/reference-durations'
import type { LoadReport } from '@/lib/load/model'
import { describeConflict, detectConflicts, nameOf } from '@/lib/ops/conflicts'

/**
 * Deterministic ranking of what needs attention, so "Today's Priority" is always the single
 * most urgent, specific, actionable item, with a person, a time and a consequence, instead of
 * generic advice. The LLM may rephrase it; it never decides what the priority is.
 */

export type PriorityKind = 'conflict' | 'obligation' | 'handoff' | 'burnout'

export interface PriorityItem {
  id: string
  kind: PriorityKind
  severity: InsightSeverity
  /** Higher is more urgent. */
  score: number
  /** Members the item concerns, most responsible first. */
  personIds: string[]
  /** ISO moment it happens or is due; null when it has no date (e.g. burnout). */
  at: string | null
  /** One concrete sentence a person can act on right now. */
  action: string
  /** What happens if nobody acts. */
  consequence: string
  sources: SourceRef[]
}

const SEVERITY_BASE: Record<InsightSeverity, number> = { critical: 100, warning: 60, info: 30 }
const CATEGORY_BONUS: Record<string, number> = { Health: 15, Residency: 10, School: 8, Finance: 6, Home: 5 }
function severityFor(daysUntil: number, criticalWithin = 1, warningWithin = 3): InsightSeverity {
  if (daysUntil <= criticalWithin) return 'critical'
  if (daysUntil <= warningWithin) return 'warning'
  return 'info'
}

const urgencyBonus = (daysUntil: number) => Math.max(0, 30 - 3 * Math.max(daysUntil, 0))

// ── Calendar conflicts ─────────────────────────────────────────────────────────────

function severityForConflict(daysUntil: number): InsightSeverity {
  return severityFor(daysUntil)
}

function conflictItems(family: Family, today: Date): PriorityItem[] {
  return detectConflicts(family, today).map((c) => {
    const severity = severityForConflict(c.daysUntil)
    const { conflict, suggestion } = describeConflict(c, family, today)
    const affected = nameOf(family.members, c.movable.memberId)
    return {
      id: c.id,
      kind: 'conflict' as const,
      severity,
      score: SEVERITY_BASE[severity] + urgencyBonus(c.daysUntil) + (c.sameOwner ? 10 : 0),
      personIds: c.responsibleIds,
      at: c.at,
      action: `${conflict}. ${suggestion}`,
      consequence:
        c.events.length > 1
          ? `If nobody is reassigned, "${c.movable.title}" has no one responsible and ${affected} is affected.`
          : 'The commitment is missed or double-booked.',
      sources: c.events.map((e) => ({ type: 'event' as const, id: e.id })),
    }
  })
}

// ── Obligations ────────────────────────────────────────────────────────────────────

function obligationItems(obligations: Obligation[], family: Family, today: Date): PriorityItem[] {
  const items: PriorityItem[] = []
  for (const o of obligations) {
    if (o.status !== 'open') continue
    // Daily and weekly routines are load, not deadlines: they never become "the priority".
    if (o.recurrence === 'daily' || o.recurrence === 'weekly') continue
    const daysUntil = differenceInCalendarDays(new Date(o.dueDate), today)
    if (daysUntil > o.leadTimeDays) continue

    const owner = nameOf(family.members, o.ownerId)
    const severity: InsightSeverity =
      daysUntil <= 1 ? 'critical' : daysUntil <= Math.max(3, Math.floor(o.leadTimeDays / 3)) ? 'warning' : 'info'
    const when = daysUntil < 0 ? `was due ${format(new Date(o.dueDate), 'd MMM')}` : `is due ${format(new Date(o.dueDate), 'EEE d MMM')}`
    const noBackup = o.backupIds.length === 0

    items.push({
      id: `obligation:${o.id}`,
      kind: 'obligation',
      severity: daysUntil < 0 ? 'critical' : severity,
      score:
        SEVERITY_BASE[daysUntil < 0 ? 'critical' : severity] +
        urgencyBonus(daysUntil) +
        (CATEGORY_BONUS[o.category] ?? 0) +
        (noBackup ? 5 : 0),
      personIds: [o.ownerId],
      at: o.dueDate,
      action: `${owner}: "${o.title}" ${when}${noBackup ? ' and nobody else is set up to do it' : ''}.`,
      consequence: o.consequence,
      sources: [{ type: 'obligation', id: o.id }],
    })
  }
  return items
}

// ── Handoffs & burnout ─────────────────────────────────────────────────────────────

function handoffItems(handoffs: Handoff[], family: Family, today: Date): PriorityItem[] {
  return handoffs
    .filter((h) => h.status === 'pending')
    .map((h) => ({
      id: `handoff:${h.id}`,
      kind: 'handoff' as const,
      severity: 'warning' as const,
      score: SEVERITY_BASE.warning + 10 - differenceInCalendarDays(today, new Date(h.createdAt)),
      personIds: [h.toId, h.fromId],
      at: null,
      action: `${nameOf(family.members, h.toId)}: ${nameOf(family.members, h.fromId)} asks you to take "${h.itemTitle}". Accept, decline or suggest someone else.`,
      consequence: `${nameOf(family.members, h.fromId)} keeps carrying it until you answer.`,
      sources: [{ type: 'handoff' as const, id: h.id }],
    }))
}

function burnoutItems(load: LoadReport | undefined, family: Family): PriorityItem[] {
  if (!load) return []
  return load.members
    .filter((m) => m.score >= BURNOUT_THRESHOLD)
    .map((m) => ({
      id: `burnout:${m.memberId}`,
      kind: 'burnout' as const,
      severity: 'warning' as const,
      score: SEVERITY_BASE.warning + (m.score - BURNOUT_THRESHOLD),
      personIds: [m.memberId],
      at: null,
      action: `${nameOf(family.members, m.memberId)}'s load is ${m.score}/100 this week (${m.hours}h, ${m.daysWithoutRest} days since a rest block). Review the proposed handoffs.`,
      consequence: 'Sustained load above the burnout threshold with no rest block scheduled.',
      sources: [] as SourceRef[],
    }))
}

// ── Public API ─────────────────────────────────────────────────────────────────────

export function buildPriorityItems(family: Family, today: Date, load?: LoadReport): PriorityItem[] {
  return [
    ...conflictItems(family, today),
    ...obligationItems(family.obligations ?? [], family, today),
    ...handoffItems(family.handoffs ?? [], family, today),
    ...burnoutItems(load, family),
  ].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

/** Items relevant to one member (they are involved or responsible), still ranked. */
export function priorityFor(items: PriorityItem[], memberId: string): PriorityItem[] {
  return items.filter((i) => i.personIds.includes(memberId))
}

export function topPriority(items: PriorityItem[]): PriorityItem | null {
  return items[0] ?? null
}

/** Phrases that mean the model gave generic advice instead of a specific action. */
export const GENERIC_PRIORITY_PATTERNS: RegExp[] = [
  /review (your|the) (schedule|calendar|day)/i,
  /check in with the family/i,
  /stay on top of/i,
  /keep an eye on/i,
  /make sure everything/i,
  /have a (great|good) day/i,
]

export const isGenericPriority = (text: string) => GENERIC_PRIORITY_PATTERNS.some((p) => p.test(text))
