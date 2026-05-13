import { z } from 'zod'
import { nemotronNano } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { Family } from '@/types'
import type { CaregiverOutput } from '@/types/agents'

const CaregiverSchema = z.object({
  loadDistribution: z.array(
    z.object({
      memberName: z.string(),
      score: z.number().int().min(0).max(100),
    }),
  ),
  atRiskMember: z
    .object({
      name: z.string(),
      score: z.number().int(),
      threshold: z.number(),
      pointsAbove: z.number().int(),
      daysWithoutRest: z.number().int().min(0),
      summary: z.string(),
    })
    .optional(),
  autoInterventions: z.array(
    z.object({
      description: z.string(),
      type: z.enum(['personal_time', 'logistical_load', 'medical_coordination']),
    }),
  ),
  loadBreakdownByCategory: z.array(
    z.object({
      category: z.string(),
      // Explicit members — z.record() generates `propertyNames` which NVIDIA grammar rejects
      scores: z.object({
        Salem:  z.number(),
        Fatima: z.number(),
        Layla:  z.number(),
        Khalid: z.number(),
        Aisha:  z.number(),
      }),
    }),
  ),
})

function buildCaregiverContext(family: Family): string {
  const today = new Date().toISOString().slice(0, 10)

  const memberLines = family.members
    .map((m) => {
      const conditions = m.healthProfile?.conditions?.join(', ') || 'none'
      const riskFlags = m.healthProfile?.riskFlags?.join(', ') || 'none'
      const meds =
        m.medications.length > 0
          ? m.medications.map((med) => `${med.name} ${med.dosage} ${med.frequency}`).join(', ')
          : 'none'

      const eventsByCategory = m.calendarEvents.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const eventSummary =
        Object.entries(eventsByCategory)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(', ') || 'none'

      const medicalEvents = m.calendarEvents
        .filter((e) => e.category === 'medical')
        .map((e) => `    - "${e.title}" on ${e.date.slice(0, 10)}`)
        .join('\n')

      return `[${m.id}] ${m.name} — ${m.role}, age ${m.age}
  Health conditions: ${conditions}
  Risk flags: ${riskFlags}
  Medications managed: ${meds}
  Calendar density by category: ${eventSummary}${medicalEvents ? `\n  Medical appointments:\n${medicalEvents}` : ''}`
    })
    .join('\n\n')

  const caregivers = family.members.filter((m) => m.role === 'parent')
  const dependents = family.members.filter((m) => m.role === 'child' || m.role === 'grandparent')

  return `Family: ${family.name}
Today: ${today}
Burnout threshold: 75/100 — scores above this require automatic intervention.

Primary caregivers: ${caregivers.map((m) => `${m.name} (${m.role})`).join(', ')}
Members requiring care: ${dependents.map((m) => `${m.name} (${m.role}, age ${m.age})`).join(', ')}

=== MEMBER PROFILES & LOAD SIGNALS ===

${memberLines}`
}

export async function runCaregiverAgent(family: Family): Promise<CaregiverOutput> {
  const context = buildCaregiverContext(family)
  const culturalCtx = getCulturalContext(new Date())
  const culturalBlock = formatCulturalContextBlock(culturalCtx)

  console.log('[caregiver-agent] Starting — family:', family.name, '| members:', family.members.length)
  console.log('[caregiver-agent] Context length (chars):', context.length)

  const startMs = Date.now()

  const result = await safeGenerateObject({
    model: nemotronNano,
    mode: 'json' as const,
    providerOptions: {
      openai: {
        chat_template_kwargs: { enable_thinking: false },
      },
    },
    schema: CaregiverSchema,
    timeoutMs: 60_000,
    fallbackTimeoutMs: 90_000,
    system: `You are Bayt's Caregiver Agent. Your mission is to detect caregiver burnout before it happens and redistribute invisible family workload.

${culturalBlock}


You analyze who carries medical coordination, school admin, meal planning, and emotional labor in the ${family.name} family — and surface imbalances before they become crises.

BURNOUT THRESHOLD: 75/100. Any primary caregiver scoring above 75 requires automatic intervention.

ANALYSIS APPROACH:
- Primary caregivers are the parents. Estimate their invisible labor from: number and age of dependents, health complexity (medications, medical appointments), calendar density, grandparent care burden on top of child-rearing.
- Grandparents who are elderly and have health needs are dependents, not caregivers — score them 0–20.
- Children carry small self-directed loads (school tasks, social) — score them 5–30.
- The caregiver who manages the most medical appointments, school admin, and meal preparation will typically score highest.

OUTPUT REQUIREMENTS:

loadDistribution (one entry per family member, all members):
- memberName: exact names as given.
- score: 0–100. Reflect caregiving burden, not just busyness.

atRiskMember (omit if no one exceeds 75):
- The highest-scoring member above 75.
- threshold: always 75.
- pointsAbove: their score minus 75.
- daysWithoutRest: estimate from calendar density and dependency count.
- summary: 2–3 sentences. Name the specific tasks, the dependents, the duration driving burnout.

autoInterventions (2–4, only if atRiskMember present):
- Each intervention directly reduces the at-risk member's load.
- type:
  - 'personal_time': block rest time, remove optional tasks
  - 'logistical_load': shift transport or errand to another family member
  - 'medical_coordination': reroute a medical notification or appointment responsibility
- description: specific and actionable — name who, what, when.

loadBreakdownByCategory (exactly 5 categories: Meals, Medical, School Admin, Social, Emotional):
- scores: each family member's contribution per category (0–100).
- The at-risk member should score highest in most categories.
- Use member names as keys (not IDs).`,
    prompt: context,
  })

  const elapsedMs = Date.now() - startMs
  console.log(`[caregiver-agent] returned in ${elapsedMs}ms | ok=${result.ok}`)

  if (!result.ok) {
    console.error('[caregiver-agent] FAILED:', result.error)
    throw new Error(`Caregiver agent failed: ${result.error}`)
  }

  const output = result.data as CaregiverOutput

  console.log(
    '[caregiver-agent] Load distribution:',
    output.loadDistribution.map((l) => `${l.memberName}:${l.score}`).join(', '),
  )
  if (output.atRiskMember) {
    console.log(
      `[caregiver-agent] At-risk: ${output.atRiskMember.name} score=${output.atRiskMember.score} (+${output.atRiskMember.pointsAbove} above threshold, ${output.atRiskMember.daysWithoutRest}d without rest)`,
    )
  } else {
    console.log('[caregiver-agent] No member above burnout threshold')
  }
  console.log('[caregiver-agent] Auto-interventions:', output.autoInterventions.length)

  return output
}
