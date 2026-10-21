import { z } from 'zod'
import type { LanguageModel } from 'ai'
import { geminiFlash } from '@/lib/ai/client'
import { ollamaHealth, isPrivacyVaultEnabled, checkOllamaAvailable } from '@/lib/ai/ollama'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { buildLocalHealthOutput } from '@/lib/health/patterns'
import { getToday } from '@/lib/time/today'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { AgentResult } from './runs'
import type { Family, FamilyMember } from '@/types'
import type { HealthOutput } from '@/types/agents'

const HealthSchema = z.object({
  familyPatterns: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      affectedMembers: z.array(z.string()),
      severity: z.enum(['info', 'warning', 'critical']),
      description: z.string(),
      recommendation: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  memberSummaries: z.array(
    z.object({
      memberId: z.string(),
      overallStatus: z.enum(['good', 'monitor', 'alert']),
      topFlags: z.array(z.string()).max(3),
      keyMetrics: z.array(z.object({ label: z.string(), value: z.string() })),
    }),
  ),
})

function formatMemberHealth(m: FamilyMember): string {
  const profile = m.healthProfile
  const conditions = profile?.conditions?.join(', ') || 'none reported'
  const riskFlags = profile?.riskFlags?.join(', ') || 'none'

  const labs =
    profile?.lastLabResults?.length
      ? profile.lastLabResults
          .map((l) => `    ${l.test}: ${l.value} ${l.unit} [ref: ${l.referenceRange}] — ${l.status} (${l.date})`)
          .join('\n')
      : '    (no lab results)'

  const meds =
    m.medications.length
      ? m.medications
          .map((med) => {
            const interactions = med.interactions.length
              ? `interactions: ${med.interactions.join(', ')}`
              : 'no known interactions'
            return `    ${med.name} ${med.dosage} ${med.frequency} — ${interactions}`
          })
          .join('\n')
      : '    (no medications)'

  const wearable = profile?.wearableData
    ? `    HR avg: ${profile.wearableData.avgHeartRate} bpm | Sleep: ${profile.wearableData.sleepHours}h | Steps: ${profile.wearableData.steps}/day | Last sync: ${profile.wearableData.lastSync}`
    : '    (no wearable data)'

  return `[${m.id}] ${m.name} — ${m.role}, age ${m.age}
  Conditions: ${conditions}
  Risk flags: ${riskFlags}
  Medications:
${meds}
  Last labs:
${labs}
  Wearable:
${wearable}`
}

function buildHealthContext(family: Family): string {
  const memberBlocks = family.members.map(formatMemberHealth).join('\n\n')

  const memberIndex = family.members
    .map((m) => `  ${m.id} = ${m.name}`)
    .join('\n')

  return `Family: ${family.name}

Member ID reference:
${memberIndex}

=== FULL HEALTH PROFILES ===

${memberBlocks}`
}

export async function runHealthAgent(
  family: Family,
  now: Date = getToday(),
  options: { offline?: boolean } = {},
): Promise<AgentResult<HealthOutput>> {
  const local = () => buildLocalHealthOutput(family)

  // Demo mode: the locally computed summaries are the intended output, not a degraded one.
  if (options.offline) return { output: local(), isFallback: false }

  const context = buildHealthContext(family)
  const culturalCtx = getCulturalContext(now, family.members)
  const culturalBlock = formatCulturalContextBlock(culturalCtx)

  console.log('[health-agent] Starting — family:', family.name, '| members:', family.members.length)

  // ── Privacy Vault routing (fail-closed) ──────────────────────────────────────
  let model: LanguageModel = geminiFlash
  let timeoutMs = 45_000
  let failover = true

  if (await isPrivacyVaultEnabled()) {
    const up = await checkOllamaAvailable()
    if (!up) {
      // Never fall back to the cloud with health data. Compute locally instead.
      console.error('[health-agent] Privacy Vault is on but Ollama is offline — computing summaries locally, nothing sent to the cloud')
      return {
        output: local(),
        isFallback: true,
        error: 'Privacy Vault is on but the local model is offline, so summaries were computed locally without AI.',
      }
    }
    model = ollamaHealth
    timeoutMs = 120_000
    failover = false
    console.log('[health-agent] Privacy Vault ACTIVE — routing to local Ollama, cloud failover disabled')
  }

  const startMs = Date.now()
  const result = await safeGenerateObject({
    model,
    schema: HealthSchema,
    timeoutMs,
    fallbackTimeoutMs: 60_000,
    failover,
    system: `You are Bayt's Health Agent. You think across the family unit, not the individual.

${culturalBlock}

Your job is cross-family pattern detection: spotting shared risks, hereditary signals, medication interaction risks that span multiple people, and nutritional or lifestyle clusters that affect more than one member.

ANALYSIS APPROACH:
- Read ALL members' lab results, medications, conditions, wearable data, and risk flags.
- Look for patterns that cross individuals: shared deficiencies, related chronic conditions, medications that interact if shared or if caregiving patterns overlap.
- Think generationally: child growth issues + parent metabolic conditions + grandparent bone health often connect.
- Do NOT just list each member's issues independently — surface the FAMILY-LEVEL patterns.
- Only describe what the records support. Do not invent results, diagnoses, projections or percentages. You are not giving medical advice: recommend asking the relevant clinician.

OUTPUT REQUIREMENTS:

familyPatterns (up to 5 patterns):
- Each pattern MUST span at least one shared risk or linked condition across 2+ members.
- affectedMembers: use member IDs exactly as given in the member ID reference.
- severity: 'info' for informational/preventive, 'warning' for emerging risk, 'critical' for active clinical concern.
- recommendation: concrete and cautious: foods, tests to ask about, who to talk to.
- confidence: 0.0–1.0 based on how much data supports the pattern (lab evidence = high, lifestyle inference = lower).
- Examples of patterns to look for, only if the data supports them: the same lab out of range for several members, linked metabolic or bone-health risks across generations, medications that could be mixed up between people who share care, shared sleep disruption, a shared cardiovascular risk chain.

memberSummaries (one per member):
- overallStatus: 'good' / 'monitor' / 'alert' based on lab statuses and risk flags.
- topFlags: up to 3 most significant issues for this member (specific, not generic).
- keyMetrics: 3–5 data points as [{label, value}] taken from the records.

Be specific. Reference actual values from the data.`,
    prompt: context,
  })

  console.log(`[health-agent] returned in ${Date.now() - startMs}ms | ok=${result.ok}`)

  if (!result.ok) {
    console.error('[health-agent] FAILED, using locally computed summaries:', result.error)
    return { output: local(), isFallback: true, error: result.error }
  }

  // Drop anything that points at a member id that does not exist.
  const known = new Set(family.members.map((m) => m.id))
  const output = result.data as Omit<HealthOutput, 'crossLinks'>
  return {
    output: {
      familyPatterns: output.familyPatterns
        .map((p) => ({ ...p, affectedMembers: p.affectedMembers.filter((id) => known.has(id)) }))
        .filter((p) => p.affectedMembers.length > 0),
      memberSummaries: output.memberSummaries.filter((s) => known.has(s.memberId)),
      crossLinks: [],
    },
    isFallback: false,
  }
}
