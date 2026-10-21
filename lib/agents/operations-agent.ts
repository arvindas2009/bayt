import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { computeLoad } from '@/lib/load/model'
import { computeTimeDividend } from '@/lib/load/time-dividend'
import { CONSTRAINT_LABELS, familyConstraints, type MemberConstraints } from '@/lib/meals/constraints'
import { buildFallbackPlan } from '@/lib/meals/fallback-plan'
import { validatePlan, type PlanChange } from '@/lib/meals/validate'
import { describeConflict, detectConflicts, nameOf } from '@/lib/ops/conflicts'
import { buildSchoolHealthBriefs } from '@/lib/ops/school-briefs'
import { getToday } from '@/lib/time/today'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { AgentResult } from './runs'
import type { Family } from '@/types'
import type { DayPlan, OperationsOutput, SchoolDraft } from '@/types/agents'

/**
 * Operations agent. Code decides, the model writes:
 *
 *  - Calendar conflicts and school health briefs are DETERMINISTIC (lib/ops). They are facts about
 *    the data, and the briefs mention conditions, which must never reach a third-party model.
 *  - The meal plan is written by the model from abstract diet CONSTRAINTS only (never diagnoses or
 *    medication names), then every meal is checked against every member's constraints in code.
 *  - Email drafts are written by the model from event titles and names only.
 */

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const LlmMealSchema = z.object({
  name: z.string().describe('Dish name, e.g. "Vegetable machboos"'),
  tags: z.array(z.string()).describe('Short labels such as "Vegetarian", "Quick", "Traditional"'),
  calories: z.number(),
  ingredients: z
    .array(z.string())
    .min(3)
    .describe('COMPLETE list of lowercase ingredients, including grains, oils, sauces and sweeteners. It is checked against diets, so omit nothing.'),
})

const MealPlanSchema = z.object({
  weeklyPlan: z
    .array(
      z.object({
        day: z.enum(DAY_NAMES),
        breakfast: LlmMealSchema,
        lunch: LlmMealSchema,
        dinner: LlmMealSchema,
      }),
    )
    .length(7),
})

function mealPlanPrompt(family: Family, constraints: MemberConstraints[], ramadan: boolean, culturalBlock: string) {
  const people = constraints
    .map((c) => {
      const member = family.members.find((m) => m.id === c.memberId)
      const likes = member?.preferences?.foodLikes?.join(', ') || 'no stated favourites'
      const dislikes = member?.preferences?.foodDislikes?.join(', ') || 'none'
      const rules = c.constraints.length ? c.constraints.map((k) => CONSTRAINT_LABELS[k]).join('; ') : 'no restrictions'
      return `  - ${c.name} (id ${c.memberId}): ${rules}. Likes: ${likes}. Dislikes: ${dislikes}.`
    })
    .join('\n')

  const ramadanNote = ramadan
    ? `
RAMADAN MODE IS ACTIVE:
- breakfast field is SUHOOR (pre-dawn): nourishing, high protein, slow-release carbohydrates, hydrating. Prefix the name with "Suhoor: ".
- lunch field is a LIGHT IFTAR STARTER or the early-evening bite: dates and water first. Prefix the name with "Iftar starter: ".
- dinner field is the IFTAR main meal: warm and generous. Prefix the name with "Iftar: ".
- Add the tag "suhoor" or "iftar". All dietary rules still apply together.`
    : ''

  return {
    system: `You are Bayt's Operations Agent, the planning brain for the ${family.name} family's kitchen.

${culturalBlock}

Write a 7-day meal plan (Monday to Sunday: breakfast, lunch, dinner).

CUISINE: Gulf and Emirati home cooking first. Favour dishes such as machboos (vegetable, chicken, fish), saloona, madrouba, harees (only when gluten allows), balaleet (occasionally), lentil shorba, balila, foul medames, egg and tomato dishes, grilled hammour or kingfish, labneh plates, koussa, vegetable biryani, chickpea curry. Avoid generic Western meals (oatmeal, chicken wraps, salmon bowls).
VARIETY: no dish may repeat in the week. Make at least three lunches or dinners suit vegetarians.
DIETS (all members, simultaneously):
${people}

Design each dish to suit as many members as possible. Where a dish cannot suit everyone, still list its real ingredients: the system checks every dish against every person and swaps in a named alternative for anyone it excludes. Never hide an ingredient to make a dish look compliant.
All food must be halal.${ramadanNote}`,
    prompt: `Plan the week for ${family.members.length} people. Return the 7 days now.`,
  }
}

const DraftSchema = z.object({
  drafts: z.array(
    z.object({
      memberId: z.string().describe('Id of the child the email is about'),
      to: z.string().describe('Recipient, e.g. "School office"'),
      subject: z.string(),
      preview: z.string().describe('One-sentence preview'),
      body: z.string().describe('Complete, ready-to-send email, 2 short paragraphs, signed with the sender name'),
    }),
  ),
})

export interface OperationsRunOptions {
  /** Skip every model call and use the built-in plan (demo mode). Not reported as a fallback. */
  offline?: boolean
}

export async function runOperationsAgent(
  family: Family,
  now: Date = getToday(),
  options: OperationsRunOptions = {},
): Promise<AgentResult<OperationsOutput>> {
  const culturalCtx = getCulturalContext(now, family.members)
  const culturalBlock = formatCulturalContextBlock(culturalCtx)
  const ramadan = ['ramadan', 'iftar_focus', 'suhoor_focus'].includes(culturalCtx.mealPlanningMode)
  const constraints = familyConstraints(family.members)

  // ── Deterministic: who is carrying what, clashes, school briefs ─────────────────────
  const load = computeLoad(family, now)
  const sender =
    family.members.find((m) => m.id === load.topMemberId && m.role === 'parent') ??
    family.members.find((m) => m.role === 'parent') ??
    family.members[0]
  const senderFullName = `${sender.name} ${family.name}`

  const clusters = detectConflicts(family, now)
  const calendarConflicts = clusters.map((c) => ({
    members: c.responsibleIds,
    date: c.at,
    ...describeConflict(c, family, now),
    sources: c.events.map((e) => ({ type: 'event' as const, id: e.id })),
  }))

  const schoolHealthBriefs = buildSchoolHealthBriefs(family, senderFullName, now, culturalCtx, family.obligations ?? [])

  // ── Model: meal plan (constraints only) and email drafts, in parallel ───────────────
  const draftTriggers = clusters.filter((c) => c.events.some((e) => e.category === 'education'))
  const mealPrompt = mealPlanPrompt(family, constraints, ramadan, culturalBlock)

  const offline = options.offline === true
  const [mealResult, draftResult] = await Promise.all([
    offline ? Promise.resolve(null) : safeGenerateObject({
      model: geminiFlash,
      schema: MealPlanSchema,
      timeoutMs: 60_000,
      fallbackTimeoutMs: 90_000,
      system: mealPrompt.system,
      prompt: mealPrompt.prompt,
    }),
    offline || draftTriggers.length === 0
      ? Promise.resolve(null)
      : safeGenerateObject({
          model: geminiFlash,
          schema: DraftSchema,
          timeoutMs: 45_000,
          system: `You write short, warm, professional emails from a parent to their child's school. Sign off as ${senderFullName}. Use "Dear School Team," if no contact name is known. Do not mention medical conditions.`,
          prompt: `Write one email per situation below. Children: ${family.members
            .filter((m) => m.role === 'child')
            .map((m) => `${m.name} (id ${m.id})`)
            .join(', ')}.\n\n${draftTriggers
            .map((c, i) => {
              const school = c.events.find((e) => e.category === 'education')!
              const covering = c.substitute ? `${c.substitute.name} will attend instead of ${nameOf(family.members, school.ownerId)}` : 'attendance to be confirmed'
              return `${i + 1}. "${school.title}" for ${nameOf(family.members, school.memberId)} (id ${school.memberId}) ${describeConflict(c, family, now).conflict}. Plan: ${covering}.`
            })
            .join('\n')}`,
        }),
  ])

  // ── Meal plan: validate the model's plan, or fall back to the built-in one ─────────
  let weeklyPlan: DayPlan[]
  let changes: PlanChange[] = []
  let isFallback = false
  let error: string | undefined

  if (mealResult && mealResult.ok) {
    const plan: DayPlan[] = mealResult.data.weeklyPlan.map((d) => ({
      day: d.day,
      breakfast: { ...d.breakfast, suitableFor: [] },
      lunch: { ...d.lunch, suitableFor: [] },
      dinner: { ...d.dinner, suitableFor: [] },
    }))
    const report = validatePlan(plan, constraints)
    weeklyPlan = report.plan
    changes = report.changes
  } else {
    // Offline (demo) uses the built-in plan on purpose; a failed model call is a reported fallback.
    isFallback = !offline
    error = mealResult && !mealResult.ok ? `Meal plan: ${mealResult.error}` : undefined
    const fallback = buildFallbackPlan(constraints, { ramadan })
    weeklyPlan = fallback.plan
    changes = fallback.changes
  }

  const schoolDrafts: SchoolDraft[] =
    draftResult && draftResult.ok
      ? draftResult.data.drafts.filter((d) => family.members.some((m) => m.id === d.memberId))
      : []
  if (draftResult && !draftResult.ok) error = [error, `Drafts: ${draftResult.error}`].filter(Boolean).join(' | ')

  const dividend = computeTimeDividend(
    {
      conflictDates: clusters.map((c) => c.at),
      mealPlanGeneratedAt: now.toISOString(),
      draftCount: schoolDrafts.length,
      handoffs: [],
    },
    now,
  )

  if (changes.length > 0) {
    console.log(`[operations-agent] Validator adjusted ${changes.length} meal(s) so every member is covered`)
  }

  return {
    output: {
      weeklyPlan,
      calendarConflicts,
      schoolDrafts,
      timeSavedHours: dividend.hours,
      schoolHealthBriefs,
    },
    isFallback,
    error,
  }
}
