import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { GENDERED, addsNoNumbers } from '@/lib/ai/guards'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { BURNOUT_THRESHOLD, WEEKLY_CAPACITY_HOURS, referenceFor } from '@/lib/load/reference-durations'
import type { Family } from '@/types/family'
import type { HandoffProposal, SourceRef } from '@/types/agents'
import type { AbsenceResult, Failure } from './simulate'

/**
 * Handover plan for the tasks a stress test found nobody can do.
 *
 * Code decides WHO (the lowest-loaded present parent who stays under the burnout line) and WHAT
 * (the failing tasks). Every plan entry has deterministic runbook steps. A model may only reword
 * the steps, and its text is dropped if it adds a number, names a person's pronoun, or is not about
 * a task we asked for. Anything clinical is described generically before it reaches the model.
 * Each placement is a PROPOSAL: it becomes a pending handoff the recipient must accept.
 */

const MAX_ENTRIES = 8

export interface HandoverEntry {
  key: string
  title: string
  fromId: string
  /** Null when nobody present can take it without crossing the burnout line. */
  toId: string | null
  day: number
  hours: number
  steps: string[]
  reason: string
  sources: SourceRef[]
  proposal?: HandoffProposal
}

export interface HandoverPlan {
  entries: HandoverEntry[]
  proposals: HandoffProposal[]
  /** Entries nobody can safely take. */
  unplaced: number
  /** True when the step wording came from the model (and passed the guards). */
  reworded: boolean
  error?: string
}

const HEALTH_WORDS = /allerg|epi|inhal|asthma|diabet|cardio|insulin|medic|dose|prescri|physio|dental|dentist|lab\b|hba1c|paediatric|pediatric|refill|pharmac/i

/** Titles that name a condition or a drug stay on the server: the model gets a neutral description. */
function isSensitive(f: Failure): boolean {
  return f.kind === 'medication' || f.category === 'medical' || HEALTH_WORDS.test(f.title) || HEALTH_WORDS.test(f.consequence)
}

function baseSteps(f: Failure, ownerName: string, toName: string | null): string[] {
  const ref = referenceFor(f.taskType)
  const steps = [
    f.kind === 'medication'
      ? `Learn the routine from ${ownerName} before the absence starts.`
      : `${ref.note}.`,
    `If it slips: ${f.consequence.replace(/\.$/, '')}.`,
  ]
  steps.push(
    toName
      ? f.kind === 'medication'
        ? `${toName} takes it.`
        : `${toName} takes it. Ask ${ownerName} for any document, login or routine first.`
      : `Nobody present can take it without being overloaded. Ask a relative or friend, and brief them first.`,
  )
  return steps
}

/** Deterministic plan: who takes what, and the plain steps. Never calls a model. */
export function buildHandoverPlan(family: Family, sim: AbsenceResult): HandoverPlan {
  const nameOf = (id: string) => family.members.find((m) => m.id === id)?.name ?? 'Someone'
  const receivers = family.members.filter((m) => m.role === 'parent' && m.id !== sim.absentId)
  // Placement is judged on a normal week: the plan is meant to be accepted BEFORE anyone is away.
  // (The stress test separately warns when covering would push someone over the line.)
  const projected = new Map(sim.coverLoad.map((c) => [c.memberId, c.hoursBefore]))

  const entries: HandoverEntry[] = []
  const proposals: HandoffProposal[] = []

  for (const f of sim.failures.slice(0, MAX_ENTRIES)) {
    // Work done during a long absence is spread over its weeks; a short one still lands in one week.
    const weekly = (f.hours * 7) / Math.max(sim.days, 7)
    // Someone cannot cover an event that is about them (the traveller cannot hold the fort).
    const to = receivers
      .filter((m) => f.kind !== 'event' || m.id !== f.subjectId)
      .sort((a, b) => (projected.get(a.id) ?? 0) - (projected.get(b.id) ?? 0))
      .find((m) => (((projected.get(m.id) ?? 0) + weekly) / WEEKLY_CAPACITY_HOURS) * 100 < BURNOUT_THRESHOLD)

    let proposal: HandoffProposal | undefined
    if (to) {
      const scoreNow = Math.round(((projected.get(to.id) ?? 0) / WEEKLY_CAPACITY_HOURS) * 100)
      proposal = {
        itemType: f.kind,
        itemId: f.itemIds[0],
        itemTitle: f.title,
        fromId: sim.absentId,
        toId: to.id,
        hours: f.weeklyHours,
        reason: `If ${nameOf(sim.absentId)} were away ${sim.days} ${sim.days === 1 ? 'day' : 'days'}, nobody else could do this. ${to.name} carries ${scoreNow}/100 this week. Accepting makes ${to.name} a second person who can do it.`,
      }
      proposals.push(proposal)
      projected.set(to.id, (projected.get(to.id) ?? 0) + weekly)
    }

    entries.push({
      key: f.key,
      title: f.title,
      fromId: sim.absentId,
      toId: to?.id ?? null,
      day: f.day,
      hours: f.hours,
      steps: baseSteps(f, nameOf(sim.absentId), to && proposal ? to.name : null),
      reason: proposal?.reason ?? '',
      sources: f.sources,
      proposal,
    })
  }

  return { entries, proposals, unplaced: entries.filter((e) => !e.toId).length, reworded: false }
}

const RunbookSchema = z.object({
  runbooks: z
    .array(
      z.object({
        id: z.string().describe('The id of the task, exactly as given.'),
        steps: z.array(z.string().max(170)).min(1).max(3).describe('1 to 3 short imperative steps for the person covering.'),
      }),
    )
    .max(MAX_ENTRIES),
})

/**
 * Let a model reword the runbook steps. Falls back to the deterministic steps for any entry whose
 * text is missing, invents a figure, uses a gendered pronoun, or is not about a task we sent.
 */
export async function rewordRunbooks(
  family: Family,
  sim: AbsenceResult,
  plan: HandoverPlan,
  options: { offline?: boolean } = {},
): Promise<HandoverPlan> {
  if (options.offline || plan.entries.length === 0) return plan

  const nameOf = (id: string) => family.members.find((m) => m.id === id)?.name ?? 'someone'
  const byKey = new Map(sim.failures.map((f) => [f.key, f]))
  const ids = plan.entries.map((e, i) => ({ id: `t${i + 1}`, entry: e, failure: byKey.get(e.key) }))

  const facts = ids
    .map(({ id, entry, failure }) => {
      if (!failure) return ''
      const what = isSensitive(failure) ? `${referenceFor(failure.taskType).note} (a health task)` : failure.title
      const why = isSensitive(failure) ? '' : ` If missed: ${failure.consequence}`
      return `${id}: ${what}. Normally done by ${nameOf(entry.fromId)}. Cover: ${entry.toId ? nameOf(entry.toId) : 'nobody yet'}. First needed on day ${entry.day + 1}.${why}`
    })
    .filter(Boolean)
    .join('\n')

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: RunbookSchema,
    timeoutMs: 25_000,
    fallbackTimeoutMs: 40_000,
    system:
      "You are Bayt's handover writer for a family in the UAE. For each task, write 1 to 3 short, practical steps for the person covering it. Use ONLY the facts given: do not invent documents, phone numbers, places, amounts, dates or medical details. Do not add any number that is not in the facts. Never use gendered pronouns: say the person's name or \"they\". Reply with one runbook per task id.",
    prompt: facts,
  })

  if (!result.ok) return { ...plan, error: `Wording unavailable: ${result.error}` }

  const valid = new Map<string, string[]>()
  for (const r of result.data.runbooks) {
    const known = ids.find((x) => x.id === r.id)
    if (!known || valid.has(known.entry.key)) continue
    const steps = r.steps.map((s) => s.trim()).filter((s) => s.length >= 8)
    if (steps.length === 0) continue
    if (steps.some((s) => GENDERED.test(s) || !addsNoNumbers(s, facts))) continue
    valid.set(known.entry.key, steps)
  }

  return {
    ...plan,
    reworded: valid.size > 0,
    entries: plan.entries.map((e) => ({ ...e, steps: valid.get(e.key) ?? e.steps })),
  }
}
