import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { isPrivacyVaultEnabled } from '@/lib/ai/ollama'
import { isFaithfulRewrite } from '@/lib/ai/guards'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { REQUEST_BUDGET_MS } from '@/lib/ai/budget'
import { buildPriorityItems } from '@/lib/briefing/rank'
import { composeBriefing } from '@/lib/briefing/compose'
import { getFamilyWithEverything } from '@/lib/db/queries'
import prisma from '@/lib/db/prisma'
import { createPendingHandoffs } from '@/lib/handoffs/store'
import { computeLoad } from '@/lib/load/model'
import { computeTimeDividend } from '@/lib/load/time-dividend'
import { getToday } from '@/lib/time/today'
import { runOperationsAgent } from './operations-agent'
import { runHealthAgent } from './health-agent'
import { runConnectionAgent } from './connection-agent'
import { runCaregiverAgent } from './caregiver-agent'
import { serveAgent } from './runs'
import type { BriefingData } from '@/types/agents'

/**
 * Orchestrator: runs the four agents in parallel (each result cached per day and persisted as an
 * AgentRun), composes a briefing deterministically from their output, then optionally lets a
 * model polish the wording. It never throws because a model was unavailable: the deterministic
 * briefing is complete on its own, and `source` says which version you are looking at.
 */

const PolishSchema = z.object({
  summary: z.string().describe('Exactly two sentences. Keep every name, number and time.'),
  insights: z.array(
    z.object({
      id: z.string().describe('The id of the insight being rewritten, exactly as given'),
      text: z.string().describe('Rewritten in a calm, specific voice. Must keep every fact, name, number and time.'),
    }),
  ),
})

export interface OrchestratorOptions {
  /** Re-run every agent instead of using today's cached runs. */
  force?: boolean
  /** Demo mode: no model calls at all. */
  offline?: boolean
}

export async function runOrchestrator(familyId: string, options: OrchestratorOptions = {}): Promise<BriefingData> {
  const { force = false, offline = false } = options
  const now = getToday()

  const family = await getFamilyWithEverything(familyId)
  if (!family) throw new Error(`Family not found: ${familyId}`)

  console.log(`[orchestrator] Running four agents in parallel (force=${force}, offline=${offline})`)
  const startMs = Date.now()

  const [ops, health, connection, caregiver] = await Promise.all([
    serveAgent({ familyId, agent: 'operations', force, run: () => runOperationsAgent(family, now, { offline }) }),
    serveAgent({ familyId, agent: 'health', force, run: () => runHealthAgent(family, now, { offline }) }),
    serveAgent({ familyId, agent: 'connection', force, run: () => runConnectionAgent(family, now, { offline }) }),
    serveAgent({ familyId, agent: 'caregiver', force, run: () => runCaregiverAgent(family, now, { offline }) }),
  ])
  console.log(`[orchestrator] Agents done in ${Date.now() - startMs}ms`)

  // Proposals become pending handoffs; then re-read so the ranking sees them.
  await createPendingHandoffs(familyId, caregiver.proposals)
  const fresh = (await getFamilyWithEverything(familyId)) ?? family

  const load = computeLoad(fresh, now)
  const items = buildPriorityItems(fresh, now, load)
  const dividend = computeTimeDividend(
    {
      conflictDates: ops.calendarConflicts.map((c) => c.date),
      mealPlanGeneratedAt: ops._generatedAt ?? null,
      draftCount: ops.schoolDrafts.length,
      handoffs: fresh.handoffs ?? [],
    },
    now,
  )

  let briefing = composeBriefing({ family: fresh, now, load, items, ops, health, connection, caregiver, dividend })

  // The wording pass is optional. On a host with a request time limit, skip it when the agents used
  // most of the budget rather than let the whole request time out.
  const remainingMs = REQUEST_BUDGET_MS - (Date.now() - startMs)
  if (!offline && remainingMs > 12_000) briefing = await polishWording(briefing, remainingMs)

  console.log(`[orchestrator] Persisting briefing — insights: ${briefing.insights.length} | alerts: ${briefing.alerts.length} | source: ${briefing.source}`)
  await saveBriefing(familyId, briefing)
  return briefing
}

/** Ask the model to rephrase, never to add. Ids and facts are checked; on any failure keep the rules version. */
async function polishWording(briefing: BriefingData, remainingMs: number): Promise<BriefingData> {
  // With the Privacy Vault on, health-derived text must not be sent to a cloud model.
  const vaultOn = await isPrivacyVaultEnabled()
  const polishable = briefing.insights.filter((i) => !(i.agent === 'health' && vaultOn))
  if (polishable.length === 0) return briefing

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: PolishSchema,
    timeoutMs: Math.min(30_000, remainingMs * 0.5),
    fallbackTimeoutMs: Math.min(45_000, remainingMs * 0.4),
    system: `You are the Briefing Composer. Rewrite a family briefing so it reads like a calm, trusted advisor, not a report.
You may only rephrase. Do NOT add, remove or change any fact, name, number, date or time, and do not add detail, narrate or imagine scenes. Keep each insight to one or two sentences. Never use gendered pronouns: use names. The summary is exactly two sentences.`,
    prompt: `Current summary:\n${briefing.summary}\n\nInsights to rewrite:\n${polishable.map((i) => `- id ${i.id}: ${i.text}`).join('\n')}`,
  })

  if (!result.ok) {
    console.warn('[orchestrator] Wording pass unavailable, keeping the rules-based briefing:', result.error)
    return briefing
  }

  const rewritten = new Map(result.data.insights.map((i) => [i.id, i.text.trim()]))

  return {
    ...briefing,
    summary: isFaithfulRewrite(briefing.summary, result.data.summary) ? result.data.summary.trim() : briefing.summary,
    insights: briefing.insights.map((ins) => {
      const text = rewritten.get(ins.id)
      // Reject rewrites that drop a number or time: that is how facts silently change.
      return text && isFaithfulRewrite(ins.text, text) ? { ...ins, text } : ins
    }),
    source: 'llm',
  }
}

async function saveBriefing(familyId: string, briefing: BriefingData): Promise<void> {
  await prisma.briefing.create({
    data: {
      familyId,
      date: getToday(),
      summary: briefing.summary,
      opsOutput: JSON.stringify({
        insights: briefing.insights,
        dailyBreakdown: briefing.dailyBreakdown,
        dividendLines: briefing.dividendLines ?? [],
        memoryOfTheDay: briefing.memoryOfTheDay,
      }),
      healthOutput: JSON.stringify({}),
      timeSaved: briefing.timeSavedHours,
      alerts: JSON.stringify(briefing.alerts),
      isFallback: briefing.source === 'rules',
    },
  })
}
