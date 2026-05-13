import { z } from 'zod'
import type { LanguageModelV1 } from 'ai'
import { geminiFlash } from '@/lib/ai/client'
import { ollamaHealth, isPrivacyVaultEnabled, checkOllamaAvailable } from '@/lib/ai/ollama'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { Family, FamilyMember } from '@/types'
import type { HealthOutput } from '@/types/agents'

const HealthTwinSchema = z.object({
  twins: z.array(
    z.object({
      memberId: z.string(),
      currentTrajectory: z.array(
        z.object({
          year: z.number(),
          riskScore: z.number().min(0).max(100),
          dominantRisk: z.string(),
        }),
      ),
      projectedTrajectory: z.array(
        z.object({
          year: z.number(),
          riskScore: z.number().min(0).max(100),
          dominantRisk: z.string(),
        }),
      ),
      geneticRiskFactors: z.array(z.string()),
      interventionsApplied: z.array(z.string()),
      relatedAncestorId: z.string().optional(),
      relatedAncestorPattern: z.string().optional(),
    }),
  ),
})

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
  crossLinks: z.array(
    z.object({
      fromMember: z.string(),
      toMember: z.string(),
      patternId: z.string(),
      strength: z.number().min(0).max(1),
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

export async function runHealthAgent(family: Family): Promise<HealthOutput> {
  const context = buildHealthContext(family)
  const culturalCtx = getCulturalContext(new Date())
  const culturalBlock = formatCulturalContextBlock(culturalCtx)

  console.log('[health-agent] Starting — family:', family.name, '| members:', family.members.length)
  console.log('[health-agent] Context length (chars):', context.length)
  console.log('[health-agent] Member IDs:', family.members.map((m) => `${m.id}=${m.name}`).join(', '))

  const memberHealthStats = family.members.map((m) => ({
    id: m.id,
    name: m.name,
    conditionCount: m.healthProfile?.conditions?.length ?? 0,
    labCount: m.healthProfile?.lastLabResults?.length ?? 0,
    medCount: m.medications.length,
    riskFlagCount: m.healthProfile?.riskFlags?.length ?? 0,
    alertLabs: m.healthProfile?.lastLabResults?.filter((l) => l.status === 'alert').map((l) => l.test) ?? [],
    monitorLabs: m.healthProfile?.lastLabResults?.filter((l) => l.status === 'monitor').map((l) => l.test) ?? [],
  }))
  console.log('[health-agent] Member health stats:', JSON.stringify(memberHealthStats, null, 2))

  const startMs = Date.now()

  // ── Privacy Vault routing ────────────────────────────────────────────────────
  let model: LanguageModelV1 = geminiFlash
  let timeoutMs = 45_000
  let mode: 'json' | undefined = undefined

  if (isPrivacyVaultEnabled()) {
    const up = await checkOllamaAvailable()
    if (up) {
      model = ollamaHealth
      timeoutMs = 120_000
      mode = 'json'
      console.log('[health-agent] Privacy Vault ACTIVE — routing to local Ollama')
    } else {
      console.error('[health-agent] Privacy Vault enabled but Ollama is OFFLINE — refusing cloud fallback for sensitive health data')
      throw new Error(
        'Privacy Vault is enabled but Ollama is unreachable. Start Ollama or set PRIVACY_VAULT_ENABLED=false.'
      )
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const [result, twinResult] = await Promise.all([
    safeGenerateObject({
      model,
      schema: HealthSchema,
      timeoutMs,
      fallbackTimeoutMs: 60_000,
      ...(mode !== undefined && { mode }),
      system: `You are Bayt's Health Agent. You think across the family unit, not the individual.

${culturalBlock}

Your job is cross-family pattern detection: spotting shared risks, hereditary signals, medication interaction risks that span multiple people, and nutritional or lifestyle clusters that affect more than one member.

ANALYSIS APPROACH:
- Read ALL members' lab results, medications, conditions, wearable data, and risk flags.
- Look for patterns that cross individuals: shared deficiencies, related chronic conditions, medications that interact if shared or if caregiving patterns overlap.
- Think generationally: child growth issues + parent metabolic conditions + grandparent bone health often connect.
- Do NOT just list each member's issues independently — surface the FAMILY-LEVEL patterns.

OUTPUT REQUIREMENTS:

familyPatterns (3–5 patterns):
- Each pattern MUST span at least one shared risk or linked condition across 2+ members.
- affectedMembers: use member IDs exactly as given (e.g., mem_salem, mem_fatima).
- severity: 'info' for informational/preventive, 'warning' for emerging risk, 'critical' for active clinical concern.
- recommendation: concrete, actionable — specific foods, tests, schedules, referrals.
- confidence: 0.0–1.0 based on how much data supports this pattern (lab evidence = high, lifestyle inference = lower).
- Seed patterns to look for:
  • Vitamin D deficiency cluster: check lab D values across members, wearable outdoor proxies (low steps), indoor lifestyle indicators.
  • Bone health family priority: link diabetes (Salem) + osteoporosis (Aisha) + child growth markers (Khalid) into one cross-generational recommendation.
  • Medication interaction risks: any medications across caregiving pairs that could interact if doses are mixed up.
  • Sleep pattern cluster: compare wearable sleep hours across members — shared household disruption?
  • Cardiovascular risk chain: hypertension, diabetes, sedentary signals — which members share this trajectory?

memberSummaries (one per member):
- overallStatus: 'good' / 'monitor' / 'alert' — based on lab statuses and risk flags.
- topFlags: up to 3 most clinically significant issues for this member (specific, not generic).
- keyMetrics: 3–5 key data points as [{label, value}] objects (e.g., {label: "Vitamin D", value: "18 ng/mL (insufficient)"}, {label: "HbA1c", value: "7.1%"}).

crossLinks (edges for the FamilyHealthMap graph):
- One crossLink per (member pair) × (shared pattern).
- strength: 0.0–1.0 — how strongly do they share this pattern? (Both have lab-confirmed deficiency = 0.9, one has risk flag only = 0.5).
- Use member IDs exactly.

Be specific and clinical. Reference actual lab values and conditions from the data. Do not invent data not present in the context.`,
      prompt: context,
    }),
    safeGenerateObject({
      model,
      schema: HealthTwinSchema,
      timeoutMs,
      fallbackTimeoutMs: 60_000,
      ...(mode !== undefined && { mode }),
      system: `You are Bayt's Health Twin Projector. You generate generational health projections for family members.

${culturalBlock}


TASK: For each family member where a clear cross-generational ancestor link exists, project their health trajectory over the next 15 years in 3-year increments.

CURRENT YEAR: 2026. Generate data points for years: 2026, 2029, 2032, 2035, 2038, 2041.

PROJECTION RULES:
- For each adult and teenage member, project health trajectory only when ancestor data exists.
- Cross-reference their data against older family members who share genetic lineage.
- For Salem (45, T2D): his mother Aisha (71) has hypertension and osteoporosis — Salem's cardiovascular risk scores should reflect this family trajectory. relatedAncestorId = Aisha's member ID.
- For Khalid (12): his father Salem has T2D — flag early metabolic markers now, project insulin resistance risk. relatedAncestorId = Salem's member ID.
- For Layla (16): her mother Fatima has iron deficiency and anxiety — flag same pattern emerging. relatedAncestorId = Fatima's member ID.
- Generate ONLY for members where ancestor data exists — skip Fatima and Aisha unless a clear cross-generational link to a member in this family exists.
- interventionsApplied should list changes the Operations Agent has ALREADY made silently (e.g., "Added omega-3 supplement to weekly meal plan", "Scheduled Saturday morning walks", "Reduced processed sugar in weekly meal plan").

RISK SCORE GUIDANCE:
- riskScore: 0 = perfect health, 100 = critical risk.
- currentTrajectory: baseline trajectory without interventions (extrapolated from current conditions and ancestor history).
- projectedTrajectory: improved trajectory WITH the interventions already applied by the Operations Agent (should diverge positively from current trajectory, showing the benefit of interventions).
- Both trajectories start at the same 2026 riskScore (current state), then diverge from 2029 onwards.
- dominantRisk: the primary health concern driving the risk score at that year point.

Use the member IDs exactly as given in the context.`,
      prompt: context,
    }),
  ])

  const elapsedMs = Date.now() - startMs
  console.log(`[health-agent] Both calls returned in ${elapsedMs}ms | main ok=${result.ok} | twins ok=${twinResult.ok}`)

  if (!result.ok) {
    console.error('[health-agent] FAILED:', result.error)
    throw new Error(`Health agent failed: ${result.error}`)
  }

  const output = result.data as HealthOutput

  console.log('[health-agent] Patterns detected:', output.familyPatterns.length)
  output.familyPatterns.forEach((p) => {
    console.log(
      `[health-agent]   pattern="${p.title}" severity=${p.severity} confidence=${p.confidence.toFixed(2)} members=[${p.affectedMembers.join(', ')}]`,
    )
  })
  console.log('[health-agent] Member summaries:', output.memberSummaries.length)
  output.memberSummaries.forEach((s) => {
    console.log(
      `[health-agent]   member=${s.memberId} status=${s.overallStatus} flags=[${s.topFlags.join('; ')}]`,
    )
  })
  console.log('[health-agent] Cross-links:', output.crossLinks.length)
  output.crossLinks.forEach((c) => {
    console.log(
      `[health-agent]   ${c.fromMember} ↔ ${c.toMember} via pattern=${c.patternId} strength=${c.strength.toFixed(2)}`,
    )
  })

  if (twinResult.ok) {
    const twins = twinResult.data.twins
    console.log('[health-agent] Health twins generated:', twins.length)
    twins.forEach((t) => {
      console.log(
        `[health-agent]   twin=${t.memberId} ancestor=${t.relatedAncestorId ?? 'none'} riskFactors=${t.geneticRiskFactors.length}`,
      )
    })
    output.healthTwins = twins
  } else {
    console.warn('[health-agent] Twin generation failed (non-fatal):', twinResult.error)
    output.healthTwins = []
  }

  return output
}
