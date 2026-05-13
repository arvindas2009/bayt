import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { isPrivacyVaultEnabled } from '@/lib/ai/ollama'
import { sanitizeHealthOutput } from '@/lib/ai/sanitize-health'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { runOperationsAgent } from '@/lib/agents/operations-agent'
import { runHealthAgent } from '@/lib/agents/health-agent'
import { runConnectionAgent } from '@/lib/agents/connection-agent'
import { runCaregiverAgent } from '@/lib/agents/caregiver-agent'
import { mockConnectionOutput } from '@/lib/data/mock-connection'
import { mockCaregiverOutput } from '@/lib/data/mock-caregiver'
import prisma from '@/lib/db/prisma'
import type { Family } from '@/types'
import type {
  BriefingData,
  BriefingInsight,
  BriefingAlert,
  ConnectionOutput,
  CaregiverOutput,
  OperationsOutput,
  HealthOutput,
} from '@/types/agents'

// ─── Synthesis schema ─────────────────────────────────────────────────────────

const SynthesisSchema = z.object({
  summary: z.string(),
  insights: z
    .array(
      z.object({
        agent: z.enum(['operations', 'health', 'connection', 'caregiver']),
        severity: z.enum(['info', 'warning', 'critical']),
        text: z.string(),
      }),
    )
    .min(4)
    .max(6),
  alerts: z.array(
    z.object({
      severity: z.enum(['info', 'warning', 'critical']),
      text: z.string(),
      memberName: z.string(),
      memberId: z.string(),
      agent: z.enum(['operations', 'health', 'connection', 'caregiver']),
    }),
  ),
})

// ─── Build synthesis prompt ───────────────────────────────────────────────────

function buildSynthesisContext(
  family: Family,
  opsResult: OperationsOutput,
  healthResult: HealthOutput,
  connectionResult: ConnectionOutput,
  caregiverResult: CaregiverOutput,
): string {
  const memberIndex = family.members.map((m) => `  ${m.id} = ${m.name}`).join('\n')

  const conflicts =
    opsResult.calendarConflicts.length > 0
      ? opsResult.calendarConflicts
          .map(
            (c) =>
              `  - ${c.date}: ${c.conflict}\n    members: ${c.members.join(', ')}\n    suggestion: ${c.suggestion}`,
          )
          .join('\n')
      : '  (none detected)'

  const patterns =
    healthResult.familyPatterns.length > 0
      ? healthResult.familyPatterns
          .map(
            (p) =>
              `  - [${p.severity.toUpperCase()}] ${p.title} (confidence ${(p.confidence * 100).toFixed(0)}%)\n    ${p.description}\n    → ${p.recommendation}\n    Affects: ${p.affectedMembers.join(', ')}`,
          )
          .join('\n')
      : '  (none detected)'

  const memberStatuses = healthResult.memberSummaries
    .map((s) => `  - ${s.memberId} (${s.overallStatus}): ${s.topFlags.join('; ')}`)
    .join('\n')

  const driftSection =
    connectionResult.driftAlerts.length > 0
      ? connectionResult.driftAlerts
          .map(
            (d) =>
              `  - ${d.memberA}↔${d.memberB}: ${d.daysSinceContact} days [${d.severity}]\n    ${d.reason}\n    → ${d.suggestion}`,
          )
          .join('\n')
      : '  (none detected)'

  const microActionsSection =
    connectionResult.microActions.length > 0
      ? connectionResult.microActions
          .map((a) => `  - [${a.day}] ${a.type}: ${a.description} (${a.membersInvolved.join(', ')})`)
          .join('\n')
      : '  (none)'

  const caregiverLoad = caregiverResult.loadDistribution
    .map((l) => `${l.memberName}: ${l.score}`)
    .join(', ')

  const atRisk = caregiverResult.atRiskMember
    ? `${caregiverResult.atRiskMember.name} — score ${caregiverResult.atRiskMember.score}/100 (+${caregiverResult.atRiskMember.pointsAbove} above threshold, ${caregiverResult.atRiskMember.daysWithoutRest} days without rest)\n  ${caregiverResult.atRiskMember.summary}`
    : 'none'

  const interventionsSection =
    caregiverResult.autoInterventions.length > 0
      ? caregiverResult.autoInterventions
          .map((i) => `  - [${i.type}] ${i.description}`)
          .join('\n')
      : '  (none)'

  return `Family: ${family.name}
Date: ${new Date().toISOString().slice(0, 10)}

Member IDs:
${memberIndex}

=== OPERATIONS AGENT ===
Calendar conflicts:
${conflicts}
School drafts drafted: ${opsResult.schoolDrafts.length}
Time saved estimate: ${opsResult.timeSavedHours}h

=== HEALTH AGENT ===
Family-level patterns:
${patterns}
Per-member statuses:
${memberStatuses}

=== CONNECTION AGENT ===
Sync score: ${connectionResult.syncScore}/100
Drift alerts:
${driftSection}
Micro-actions:
${microActionsSection}

=== CAREGIVER AGENT ===
Load distribution: ${caregiverLoad}
At-risk: ${atRisk}
Auto-interventions:
${interventionsSection}`
}

// ─── Synthesize ───────────────────────────────────────────────────────────────

async function synthesizeBriefing({
  family,
  opsResult,
  healthResult,
  connectionResult,
  caregiverResult,
}: {
  family: Family
  opsResult: OperationsOutput
  healthResult: HealthOutput
  connectionResult: ConnectionOutput
  caregiverResult: CaregiverOutput
}): Promise<BriefingData> {
  const context = buildSynthesisContext(
    family,
    opsResult,
    healthResult,
    connectionResult,
    caregiverResult,
  )

  console.log('[orchestrator] Synthesizing — context length:', context.length, 'chars')

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: SynthesisSchema,
    timeoutMs: 60_000,
    system: `You are the Briefing Composer. Given outputs from four family agents, produce a calm, scannable morning briefing. The user is a busy parent. Prioritize what's urgent and what's beautiful. Cap at 6 insights.

SUMMARY: Exactly 2 sentences. First: the most pressing operational fact (name names, use dates). Second: family wellbeing temperature (health + connection + caregiver). Be specific — never generic.

INSIGHTS: 4–6 items, ordered critical → warning → info. Each must cite a real data point from the agent outputs. Assign the correct agent source. Write like a calm, trusted advisor — not a clinical report.

ALERTS: 1–4 items that need action today or this week. Only genuinely urgent items. Include the exact memberId from the member ID list. If nothing is urgent, return an empty array.`,
    prompt: context,
  })

  if (!result.ok) {
    throw new Error(`Synthesis failed: ${result.error}`)
  }

  const { summary, insights, alerts } = result.data as z.infer<typeof SynthesisSchema>
  const now = new Date().toISOString()

  const memories = connectionResult.memoriesVault
  const randomMemory = memories.length > 0 ? memories[Math.floor(Math.random() * memories.length)] : null

  const total = opsResult.timeSavedHours
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weights = [0.12, 0.18, 0.10, 0.22, 0.25, 0.08, 0.05]
  let running = 0
  const dailyBreakdown = days.map((day, i) => {
    running = Math.round((running + total * weights[i]) * 10) / 10
    return { day, hours: running }
  })

  return {
    date: now,
    summary,
    insights: insights.map((ins, i): BriefingInsight => ({
      id: `ins_${Date.now()}_${i}`,
      agent: ins.agent,
      severity: ins.severity,
      text: ins.text,
      timestamp: now,
    })),
    timeSavedHours: opsResult.timeSavedHours,
    dailyBreakdown,
    memoryOfTheDay: randomMemory
      ? {
          quote: randomMemory.quote,
          attribution: randomMemory.attribution,
          dateCaptured: randomMemory.date,
        }
      : undefined,
    alerts: alerts.map((a, i): BriefingAlert => ({
      id: `alert_${Date.now()}_${i}`,
      severity: a.severity,
      text: a.text,
      memberName: a.memberName,
      memberId: a.memberId,
      agent: a.agent,
    })),
  }
}

// ─── Persist ──────────────────────────────────────────────────────────────────

async function saveBriefing(familyId: string, briefing: BriefingData): Promise<void> {
  await prisma.briefing.create({
    data: {
      familyId,
      summary: briefing.summary,
      opsOutput: JSON.stringify({
        insights: briefing.insights,
        dailyBreakdown: briefing.dailyBreakdown,
        memoryOfTheDay: briefing.memoryOfTheDay,
      }),
      healthOutput: JSON.stringify({}),
      timeSaved: briefing.timeSavedHours,
      alerts: JSON.stringify(briefing.alerts),
    },
  })
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runOrchestrator(familyId: string): Promise<BriefingData> {
  console.log('[orchestrator] Starting — familyId:', familyId)

  const family = await getFamilyWithEverything(familyId)
  if (!family) throw new Error(`Family not found: ${familyId}`)

  console.log('[orchestrator] Running all four agents in parallel')
  const startMs = Date.now()

  const [opsResult, healthResult, connectionResult, caregiverResult] = await Promise.all([
    runOperationsAgent(family).catch((e) => {
      console.error('[orchestrator] Operations agent failed:', e)
      return {
        weeklyPlan: [],
        calendarConflicts: [],
        schoolDrafts: [],
        timeSavedHours: 0,
        schoolHealthBriefs: [],
      } as OperationsOutput
    }),
    runHealthAgent(family).catch((e) => {
      console.error('[orchestrator] Health agent failed:', e)
      return {
        familyPatterns: [],
        memberSummaries: [],
        crossLinks: [],
      } as HealthOutput
    }),
    runConnectionAgent(family).catch((e) => {
      console.error('[orchestrator] Connection agent failed:', e)
      return mockConnectionOutput
    }),
    runCaregiverAgent(family).catch((e) => {
      console.error('[orchestrator] Caregiver agent failed:', e)
      return mockCaregiverOutput
    }),
  ])

  console.log(`[orchestrator] Agents done in ${Date.now() - startMs}ms`)

  // ── Privacy Vault: sanitize HealthOutput before Gemini synthesis ─────────────
  const healthForSynthesis = isPrivacyVaultEnabled()
    ? sanitizeHealthOutput(healthResult)
    : healthResult
  if (isPrivacyVaultEnabled()) {
    console.log('[orchestrator] Privacy Vault — HealthOutput sanitized before Gemini synthesis')
  }
  // ────────────────────────────────────────────────────────────────────────────

  const briefing = await synthesizeBriefing({
    family,
    opsResult,
    healthResult: healthForSynthesis,
    connectionResult,
    caregiverResult,
  })

  console.log('[orchestrator] Persisting briefing — insights:', briefing.insights.length, '| alerts:', briefing.alerts.length)
  await saveBriefing(familyId, briefing)

  console.log('[orchestrator] Complete — timeSaved:', briefing.timeSavedHours, 'h')
  return briefing
}
