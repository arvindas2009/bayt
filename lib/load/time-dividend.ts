import { addDays, format, isSameDay, startOfDay } from 'date-fns'
import type { Handoff } from '@/types/family'
import { referenceFor } from './reference-durations'

/**
 * Time Dividend: hours of coordination work Bayt took off the family this week.
 *
 * Computed, not estimated. Every counted action is multiplied by the same reference durations the
 * load model uses, so the headline number can be audited line by line.
 */

export interface DividendInputs {
  /** Calendar clashes Bayt detected and proposed a fix for, each with the day it concerns. */
  conflictDates: string[]
  /** True when a weekly meal plan was generated this week. */
  mealPlanGeneratedAt: string | null
  /** School / provider drafts Bayt wrote. */
  draftCount: number
  /** Handoffs that were accepted (Bayt arranged, someone agreed). */
  handoffs: Pick<Handoff, 'status' | 'respondedAt'>[]
}

export interface DividendLine {
  label: string
  count: number
  minutes: number
}

export interface TimeDividendResult {
  hours: number
  lines: DividendLine[]
  /** The last seven days ending today, oldest first. */
  dailyBreakdown: { day: string; hours: number }[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeTimeDividend(input: DividendInputs, today: Date): TimeDividendResult {
  const end = startOfDay(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6))
  const perDay = new Array<number>(7).fill(0)

  const addMinutes = (when: Date, minutes: number) => {
    const idx = days.findIndex((d) => isSameDay(d, when))
    // Anything outside the window is not "this week".
    if (idx >= 0) perDay[idx] += minutes
    return idx >= 0
  }

  const conflictMin = referenceFor('conflict_resolution').minutes
  const planMin = referenceFor('meal_planning').minutes
  const draftMin = referenceFor('draft_message').minutes
  const handoffMin = referenceFor('handoff_coordination').minutes

  let conflicts = 0
  for (const date of input.conflictDates) {
    // A clash is resolved on the day Bayt noticed it, i.e. at most today; later clashes count today.
    const d = new Date(date)
    const when = d > end ? end : d
    if (addMinutes(when, conflictMin)) conflicts++
  }

  let plans = 0
  if (input.mealPlanGeneratedAt && addMinutes(new Date(input.mealPlanGeneratedAt), planMin)) plans = 1

  let drafts = 0
  if (input.draftCount > 0 && addMinutes(end, input.draftCount * draftMin)) drafts = input.draftCount

  let handoffs = 0
  for (const h of input.handoffs) {
    if (h.status === 'accepted' && h.respondedAt && addMinutes(new Date(h.respondedAt), handoffMin)) handoffs++
  }

  const lines: DividendLine[] = [
    { label: 'Calendar clashes spotted, fix proposed', count: conflicts, minutes: conflicts * conflictMin },
    { label: 'Weekly meal plan', count: plans, minutes: plans * planMin },
    { label: 'School and provider drafts', count: drafts, minutes: drafts * draftMin },
    { label: 'Handoffs arranged', count: handoffs, minutes: handoffs * handoffMin },
  ].filter((l) => l.count > 0)

  const totalMinutes = lines.reduce((s, l) => s + l.minutes, 0)

  return {
    hours: round1(totalMinutes / 60),
    lines,
    dailyBreakdown: days.map((d, i) => ({ day: format(d, 'EEE'), hours: round1(perDay[i] / 60) })),
  }
}
