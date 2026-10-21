import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { isFaithfulNarrative } from '@/lib/ai/guards'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { proposeHandoffs } from '@/lib/handoffs/propose'
import { computeLoad } from '@/lib/load/model'
import {
  BASELINE_WEEKLY_HOURS,
  BURNOUT_THRESHOLD,
  LOAD_CATEGORY_LABELS,
  type LoadCategory,
} from '@/lib/load/reference-durations'
import { getToday } from '@/lib/time/today'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { AgentResult } from './runs'
import type { Family } from '@/types'
import type { CaregiverIntervention, CaregiverOutput, HandoffProposal } from '@/types/agents'

/**
 * Caregiver agent. The NUMBERS (hours, scores, shares, days without rest) come from the single
 * deterministic load model; the model only writes the narrative. It is given hours per category
 * and names, never conditions, medications or appointment titles, so nothing clinical leaves the
 * server. Every intervention is a proposal the recipient must accept.
 */

const SummarySchema = z.object({
  summary: z
    .string()
    .max(520)
    .describe('At most 3 short sentences (under 60 words) naming the biggest sources of load. No gendered pronouns: use the name or "they".'),
})

const CATEGORY_ORDER: LoadCategory[] = ['medical', 'school', 'admin', 'logistics', 'meals', 'social']

function deterministicSummary(name: string, hours: number, share: number, days: number, top: [string, number][]): string {
  const biggest = top.filter(([, h]) => h > 0).slice(0, 3).map(([c, h]) => `${c.toLowerCase()} (${h}h)`).join(', ')
  return (
    `${name} carries ${hours}h of household coordination in the next 7 days, ${share}% of the family's total. ` +
    `${biggest ? `The biggest parts are ${biggest}. ` : ''}` +
    `It has been ${days >= 30 ? '30+' : days} days since ${name}'s last rest block.`
  )
}

export async function runCaregiverAgent(
  family: Family,
  now: Date = getToday(),
  options: { offline?: boolean } = {},
): Promise<AgentResult<CaregiverOutput>> {
  const load = computeLoad(family, now)
  const nameOf = (id: string) => family.members.find((m) => m.id === id)?.name ?? id

  const loadDistribution = [...load.members]
    .sort((a, b) => b.hours - a.hours)
    .map((m) => ({
      memberId: m.memberId,
      memberName: nameOf(m.memberId),
      score: m.score,
      hours: m.hours,
      shareOfLoad: m.shareOfLoad,
    }))

  // Share of each category's hours carried by each member.
  const loadBreakdownByCategory = CATEGORY_ORDER.map((category) => {
    const total = load.members.reduce((s, m) => s + m.byCategory[category], 0)
    if (total <= 0) return null
    return {
      category: LOAD_CATEGORY_LABELS[category],
      scores: Object.fromEntries(
        load.members.map((m) => [nameOf(m.memberId), Math.round((m.byCategory[category] / total) * 100)]),
      ),
    }
  }).filter((row): row is NonNullable<typeof row> => row !== null)

  // Open asks already waiting on someone count as if accepted, so repeated runs never stack up more
  // requests than the family needs, and an item someone just declined is not pushed straight back.
  const handoffs = family.handoffs ?? []
  const pending = handoffs.filter((h) => h.status === 'pending')
  const recentlyDeclined = new Set(
    handoffs
      .filter((h) => h.status === 'declined' && now.getTime() - new Date(h.respondedAt ?? h.createdAt).getTime() < 3 * 86_400_000)
      .map((h) => h.itemId),
  )
  const projected = pending.length > 0 ? computeLoad(family, now, { assumeAccepted: pending }) : load
  const newProposals = proposeHandoffs(family, projected, now, { exclude: recentlyDeclined })
  const openAsks: HandoffProposal[] = pending.map((h) => ({
    itemType: h.itemType,
    itemId: h.itemId,
    itemTitle: h.itemTitle,
    fromId: h.fromId,
    toId: h.toId,
    reason: h.reason,
    hours: Math.round((load.items.find((i) => i.id === h.itemId)?.hours ?? 0) * 10) / 10,
  }))
  const proposals: HandoffProposal[] = [...openAsks, ...newProposals]

  const top = load.members.find((m) => m.memberId === load.topMemberId)
  const atRisk = top && top.score >= BURNOUT_THRESHOLD ? top : undefined

  let error: string | undefined
  let atRiskMember: CaregiverOutput['atRiskMember']

  if (atRisk) {
    const name = nameOf(atRisk.memberId)
    const topCategories = (Object.entries(atRisk.byCategory) as [LoadCategory, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([c, h]) => [LOAD_CATEGORY_LABELS[c], h] as [string, number])

    let summary = deterministicSummary(name, atRisk.hours, atRisk.shareOfLoad, atRisk.daysWithoutRest, topCategories)

    if (!options.offline) {
      const culturalBlock = formatCulturalContextBlock(getCulturalContext(now, family.members))
      const facts = [
        `Member: ${name}`,
        `Hours of household coordination in the next 7 days: ${atRisk.hours} (typical household total is about ${BASELINE_WEEKLY_HOURS}h; this family's total is ${load.totalHours}h)`,
        `Share of the family's total: ${atRisk.shareOfLoad}%`,
        `Load score: ${atRisk.score}/100 (burnout line ${BURNOUT_THRESHOLD})`,
        `Days since last rest block: ${atRisk.daysWithoutRest}`,
        `Hours by category: ${topCategories.map(([c, h]) => `${c} ${h}`).join(', ')}`,
      ].join('\n')

      const result = await safeGenerateObject({
        model: geminiFlash,
        schema: SummarySchema,
        timeoutMs: 25_000,
        fallbackTimeoutMs: 40_000,
        system: `You are Bayt's Caregiver Agent. Explain, kindly and concretely, why one family member's invisible workload is high. Use ONLY the facts given: do not invent tasks, conditions or feelings, and do not describe anyone else in the family. Keep it to 3 short sentences. Never use gendered pronouns; say the person's name or "they".\n\n${culturalBlock}`,
        prompt: facts,
      })
      if (result.ok) {
        const text = result.data.summary.trim()
        // Accept the wording only if it adds no figures and makes no comparisons we did not compute.
        if (text.length > 20 && isFaithfulNarrative(text, facts)) summary = text
        else console.warn('[caregiver-agent] Narrative rejected (unsupported figure or comparison); using computed summary')
      } else {
        // The deterministic summary above is complete and accurate, so this is not a "preview".
        console.warn('[caregiver-agent] Narrative unavailable, using computed summary:', result.error)
        error = `Narrative: ${result.error}`
      }
    }

    atRiskMember = {
      memberId: atRisk.memberId,
      name,
      score: atRisk.score,
      threshold: BURNOUT_THRESHOLD,
      pointsAbove: atRisk.score - BURNOUT_THRESHOLD,
      daysWithoutRest: atRisk.daysWithoutRest,
      hours: atRisk.hours,
      shareOfLoad: atRisk.shareOfLoad,
      summary,
    }
  }

  const interventions: CaregiverIntervention[] = proposals.map((p) => {
    const item = load.items.find((i) => i.id === p.itemId)
    return {
      description: `Ask ${nameOf(p.toId)} to take "${p.itemTitle}" (about ${p.hours}h a week off ${nameOf(p.fromId)}).`,
      type: item?.category === 'medical' ? ('medical_coordination' as const) : ('logistical_load' as const),
      proposal: p,
    }
  })
  if (atRisk && atRisk.daysWithoutRest >= 7) {
    interventions.push({
      description: `Block a rest slot for ${nameOf(atRisk.memberId)} this week: no tasks, no reminders.`,
      type: 'personal_time',
    })
  }

  return {
    output: {
      loadDistribution,
      atRiskMember,
      interventions,
      proposals,
      loadBreakdownByCategory,
      totalHours: load.totalHours,
      baselineHours: BASELINE_WEEKLY_HOURS,
      windowStart: load.windowStart,
    },
    isFallback: false,
    error,
  }
}
