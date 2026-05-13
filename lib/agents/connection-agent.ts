import { z } from 'zod'
import { nemotronNano } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { Family } from '@/types'
import type { ConnectionOutput } from '@/types/agents'

const ConnectionSchema = z.object({
  driftAlerts: z.array(
    z.object({
      memberA: z.string(),
      memberB: z.string(),
      daysSinceContact: z.number().int().min(0),
      severity: z.enum(['critical', 'moderate', 'minor']),
      reason: z.string(),
      suggestion: z.string(),
    }),
  ),
  microActions: z.array(
    z.object({
      day: z.string(),
      type: z.enum(['quick', 'medium', 'invest']),
      description: z.string(),
      membersInvolved: z.array(z.string()),
    }),
  ),
  memoriesVault: z.array(
    z.object({
      quote: z.string(),
      attribution: z.string(),
      role: z.string(),
      date: z.string(),
    }),
  ),
  syncScore: z.number().int().min(0).max(100),
})

function buildConnectionContext(family: Family): string {
  const today = new Date().toISOString().slice(0, 10)

  const memberIndex = family.members
    .map((m) => `  ${m.id} = ${m.name} (${m.role}, age ${m.age})`)
    .join('\n')

  const memberSchedules = family.members
    .map((m) => {
      const events =
        m.calendarEvents.length > 0
          ? m.calendarEvents
              .map((e) => `    - "${e.title}" on ${e.date.slice(0, 10)} [${e.category}]`)
              .join('\n')
          : '    (no upcoming events)'
      return `[${m.id}] ${m.name} — ${m.role}, age ${m.age}
  Calendar:
${events}`
    })
    .join('\n\n')

  return `Family: ${family.name}
Today: ${today}

Member ID reference:
${memberIndex}

=== MEMBER SCHEDULES ===

${memberSchedules}`
}

export async function runConnectionAgent(family: Family): Promise<ConnectionOutput> {
  const context = buildConnectionContext(family)
  const culturalCtx = getCulturalContext(new Date())
  const culturalBlock = formatCulturalContextBlock(culturalCtx)

  console.log('[connection-agent] Starting — family:', family.name, '| members:', family.members.length)
  console.log('[connection-agent] Context length (chars):', context.length)

  const startMs = Date.now()

  const eidOrRamadanNote =
    culturalCtx.socialObligationLevel === 'high'
      ? `
SOCIAL CALENDAR NOTE: Social obligation level is HIGH (Eid or Ramadan period active). During this time, family members naturally converge through collective rituals, shared iftar meals, and Eid visits. Reduce the severity of drift alerts accordingly — brief individual gaps are expected and healthy during this period. Do not flag normal Ramadan/Eid separation patterns as critical drift. Focus alerts only on members who are genuinely isolated from the collective gatherings (e.g., an elderly grandparent not included in Eid plans).`
      : ''

  const result = await safeGenerateObject({
    model: nemotronNano,
    mode: 'json' as const,
    providerOptions: {
      openai: {
        chat_template_kwargs: { enable_thinking: false },
      },
    },
    schema: ConnectionSchema,
    timeoutMs: 60_000,
    fallbackTimeoutMs: 90_000,
    system: `You are Bayt's Connection Agent. Your mission is to protect and strengthen emotional bonds within the ${family.name} family.

${culturalBlock}
${eidOrRamadanNote}

You detect relationship drift — when family members are going too long without meaningful contact — and propose gentle micro-actions to repair connections before they erode.

ANALYSIS APPROACH:
- Review each member's calendar events to infer time spent together vs. apart.
- Look for gaps: members with no shared events in 5–14+ days, or solo-heavy schedules.
- Consider life context: exam periods, work travel, health limitations, age-appropriate independence.
- No chat logs are available — reason from calendar data and family roles.
- Prioritize parent-child bonds, grandparent isolation, and sibling dynamics.

OUTPUT REQUIREMENTS:

driftAlerts (1–4):
- Flag genuine relationship risks, not routine independence.
- severity: 'critical' (10+ days or isolation risk), 'moderate' (5–14 days, meaningful gap), 'minor' (< 7 days, gentle nudge).
- reason: cite specific evidence from the calendar data.
- suggestion: concrete, timed, low-friction — specific day of week, short duration.

microActions (3–6):
- One action per drift alert, plus 1–2 proactive family connection moments.
- day: day of week (Mon/Tue/Wed/Thu/Fri/Sat/Sun).
- type: 'quick' (< 15 min — message, voice note, shared breakfast), 'medium' (30–60 min), 'invest' (2+ hours, outing or ritual).
- membersInvolved: use member names (not IDs).

memoriesVault (3–5):
- Surface emotionally meaningful family moments as first-person quotes from family members.
- Each quote: 1–2 vivid, specific, personal sentences.
- attribution: the family member's name.
- role: their family role (Father, Mother, Daughter, Son, Grandmother, Grandfather).
- date: YYYY-MM-DD format, today or recent past.
- Write quotes that reflect actual ages — children's quotes should sound like children.

syncScore (0–100):
- 80–100: strong bonds, frequent meaningful contact.
- 60–79: mild strain, some gaps.
- 40–59: moderate concern, multiple drift risks.
- 0–39: critical disconnection or isolation.
- Score based on the number and severity of drift alerts.`,
    prompt: context,
  })

  const elapsedMs = Date.now() - startMs
  console.log(`[connection-agent] returned in ${elapsedMs}ms | ok=${result.ok}`)

  if (!result.ok) {
    console.error('[connection-agent] FAILED:', result.error)
    throw new Error(`Connection agent failed: ${result.error}`)
  }

  const output = result.data as ConnectionOutput

  console.log('[connection-agent] Drift alerts:', output.driftAlerts.length)
  output.driftAlerts.forEach((d) => {
    console.log(`[connection-agent]   ${d.memberA}↔${d.memberB}: ${d.daysSinceContact}d [${d.severity}]`)
  })
  console.log('[connection-agent] Micro-actions:', output.microActions.length)
  console.log('[connection-agent] Memories vault:', output.memoriesVault.length)
  console.log('[connection-agent] Sync score:', output.syncScore)

  return output
}
