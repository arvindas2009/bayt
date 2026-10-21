import { z } from 'zod'
import { format } from 'date-fns'
import { geminiFlash } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { computePairDrift, nextFreeEvening, selectDrift, DRIFT_LOOKBACK_DAYS, type PairDrift } from '@/lib/connection/drift'
import { getMemories } from '@/lib/db/queries'
import { getToday } from '@/lib/time/today'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { AgentResult } from './runs'
import type { Family, FamilyMember } from '@/types'
import type {
  ConnectionDriftAlert,
  ConnectionMicroAction,
  ConnectionOutput,
  MemoryVaultEntry,
} from '@/types/agents'

/**
 * Connection agent. Evidence first: the drift list is computed from SHARED CALENDAR EVENTS
 * (lib/connection/drift) and states only what the calendar shows. The model proposes a kind,
 * specific nudge for each pair it is given, and may not claim anything about conversations.
 * The Memory Vault is whatever the family actually captured; the model never writes quotes.
 */

const severityFor = (days: number | null): ConnectionDriftAlert['severity'] => {
  const d = days ?? DRIFT_LOOKBACK_DAYS
  return d >= 14 ? 'critical' : d >= 10 ? 'moderate' : 'minor'
}

const effortFor = (days: number | null): ConnectionMicroAction['type'] => ((days ?? 30) >= 14 ? 'medium' : 'quick')

function templateSuggestion(a: FamilyMember, b: FamilyMember, evening: Date | null): string {
  return evening
    ? `Both calendars are clear after 17:00 on ${format(evening, 'EEEE')}. Plan 20 minutes together, such as a walk, a call or tea.`
    : `Find 20 minutes this week for ${a.name} and ${b.name}: a call or a voice note is enough.`
}

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      pair: z.number().int().describe('The pair number being written for, exactly as numbered in the prompt'),
      suggestion: z.string().describe('One warm, specific sentence proposing a low-effort way to spend time together'),
      microAction: z.string().describe('A short imperative, under 14 words, for the week ahead'),
    }),
  ),
})

export async function runConnectionAgent(
  family: Family,
  now: Date = getToday(),
  options: { offline?: boolean } = {},
): Promise<AgentResult<ConnectionOutput>> {
  const culturalCtx = getCulturalContext(now, family.members)
  const byId = (id: string) => family.members.find((m) => m.id === id)!

  const selected: PairDrift[] = selectDrift(computePairDrift(family, now), { socialLevel: culturalCtx.socialObligationLevel })

  const evenings = new Map<string, Date | null>(
    selected.map((p) => [p.key, nextFreeEvening(byId(p.aId), byId(p.bId), now)]),
  )

  // ── Model: wording only, constrained to the pairs we computed ────────────────────
  let wording = new Map<number, { suggestion: string; microAction: string }>()
  let error: string | undefined
  let isFallback = false

  if (selected.length > 0 && !options.offline) {
    // Health overrides are irrelevant to who spends time with whom, so they are left out of this prompt.
    const culturalBlock = formatCulturalContextBlock({ ...culturalCtx, healthAlertOverrides: [] })
    const softening =
      culturalCtx.socialObligationLevel === 'high'
        ? 'It is Ramadan or Eid: gaps are expected. Keep suggestions gentle and tied to shared meals and gatherings.'
        : ''

    const result = await safeGenerateObject({
      model: geminiFlash,
      schema: SuggestionSchema,
      timeoutMs: 30_000,
      fallbackTimeoutMs: 45_000,
      system: `You are Bayt's Connection Agent. You suggest small, kind ways for family members to spend time together.
You only know what is on the shared calendar. NEVER state or imply anything about conversations, feelings, arguments or what a person said; talk only about time together.
Fit every suggestion to the real ages of the two people (a teenager will not want childish activities; a grandparent may prefer sitting activities). Use only facts given; do not invent plans, hobbies or events. ${softening}

${culturalBlock}`,
      prompt: `For each numbered pair, write one suggestion and one micro-action. Answer with the pair's number.\n\n${selected
        .map((p, i) => {
          const evening = evenings.get(p.key)
          return `${i + 1}. ${byId(p.aId).name} (${byId(p.aId).role}, age ${byId(p.aId).age}) and ${byId(p.bId).name} (${byId(p.bId).role}, age ${byId(p.bId).age}). ${p.evidence} ${
            evening ? `Both are free after 17:00 on ${format(evening, 'EEEE d MMM')}.` : 'No shared free evening this week.'
          }`
        })
        .join('\n')}`,
    })

    if (result.ok) {
      wording = new Map(
        result.data.suggestions
          .filter((s) => s.pair >= 1 && s.pair <= selected.length)
          .map((s) => [s.pair, { suggestion: s.suggestion.trim(), microAction: s.microAction.trim() }]),
      )
    } else {
      // Template wording is complete and honest; the evidence is deterministic either way.
      isFallback = true
      error = `Wording: ${result.error}`
    }
  }

  const driftAlerts: ConnectionDriftAlert[] = selected.map((p, i) => {
    const a = byId(p.aId)
    const b = byId(p.bId)
    return {
      memberA: a.name,
      memberB: b.name,
      memberAId: a.id,
      memberBId: b.id,
      daysSinceContact: p.daysSinceShared ?? DRIFT_LOOKBACK_DAYS,
      severity: severityFor(p.daysSinceShared),
      reason: p.evidence,
      suggestion: wording.get(i + 1)?.suggestion ?? templateSuggestion(a, b, evenings.get(p.key) ?? null),
      sources: p.sources,
    }
  })

  const microActions: ConnectionMicroAction[] = selected.map((p, i) => {
    const a = byId(p.aId)
    const b = byId(p.bId)
    const when = evenings.get(p.key) ?? new Date(now.getTime() + 2 * 86_400_000)
    return {
      day: format(when, 'EEE'),
      date: when.toISOString(),
      type: effortFor(p.daysSinceShared),
      description: wording.get(i + 1)?.microAction ?? `Spend 20 minutes together: ${a.name} and ${b.name}`,
      membersInvolved: [a.name, b.name],
      memberIds: [a.id, b.id],
    }
  })

  const memories = await getMemories(family.id)
  const memoriesVault: MemoryVaultEntry[] = memories.map((m) => ({
    id: m.id,
    quote: m.quote,
    attribution: family.members.find((x) => x.id === m.attribution)?.name ?? m.attribution,
    role: m.role,
    date: m.capturedAt,
    source: m.source,
  }))

  return { output: { driftAlerts, microActions, memoriesVault }, isFallback, error }
}
