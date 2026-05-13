import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getRecentCalendarEvents } from '@/lib/db/queries'
import { getCulturalContext, formatCulturalContextBlock } from '@/lib/utils/cultural-context'
import type { Family, CalendarEvent } from '@/types'
import type { OperationsOutput } from '@/types/agents'

const MealSummarySchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
  calories: z.number(),
  suitableFor: z.array(z.string()),
})

const OperationsSchema = z.object({
  weeklyPlan: z
    .array(
      z.object({
        day: z.enum([
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ]),
        breakfast: MealSummarySchema,
        lunch: MealSummarySchema,
        dinner: MealSummarySchema,
      }),
    )
    .length(7),
  calendarConflicts: z.array(
    z.object({
      members: z.array(z.string()),
      date: z.string(),
      conflict: z.string(),
      suggestion: z.string(),
    }),
  ),
  schoolDrafts: z.array(
    z.object({
      memberId: z.string(),
      to: z.string(),
      subject: z.string(),
      preview: z.string(),
      body: z.string(),
    }),
  ),
  timeSavedHours: z.number(),
  schoolHealthBriefs: z.array(
    z.object({
      memberId: z.string(),
      memberName: z.string(),
      schoolName: z.string(),
      condition: z.string(),
      draftBody: z.string(),
      draftSubject: z.string(),
      urgencyLevel: z.enum(['routine', 'seasonal', 'urgent']),
      triggerReason: z.string().describe('Why this brief is being generated now'),
      validUntil: z.string().describe('ISO date when this brief becomes stale'),
    }),
  ),
})

function buildFamilyContext(family: Family, events: CalendarEvent[]): string {
  const memberLines = family.members
    .map((m) => {
      const dietary = m.dietaryNeeds.length > 0 ? m.dietaryNeeds.join(', ') : 'none'
      const conditions = m.healthProfile?.conditions?.join(', ') || 'none'
      const meds = m.medications.map((med) => med.name).join(', ') || 'none'
      return `  - ${m.name} (${m.role}, age ${m.age}): dietary=${dietary} | conditions=${conditions} | medications=${meds}`
    })
    .join('\n')

  const memberById = Object.fromEntries(family.members.map((m) => [m.id, m.name]))

  const eventLines =
    events.length > 0
      ? events
          .map((e) => {
            const memberName = memberById[e.memberId] ?? e.memberId
            return `  - ${memberName}: "${e.title}" on ${e.date.slice(0, 10)} [${e.category}]${e.conflict ? ' ⚠ flagged conflict' : ''}`
          })
          .join('\n')
      : '  (no upcoming events)'

  return `Family: ${family.name}

Members:
${memberLines}

Upcoming calendar events (next 7 days):
${eventLines}`
}

function daysUntilDustSeason(from: Date): number {
  const year = from.getMonth() >= 9 ? from.getFullYear() + 1 : from.getFullYear()
  const start = new Date(year, 9, 1) // Oct 1
  return Math.ceil((start.getTime() - from.getTime()) / 86_400_000)
}

export async function runOperationsAgent(family: Family): Promise<OperationsOutput> {
  const events = await getRecentCalendarEvents(family.id, 7)
  const context = buildFamilyContext(family, events)
  const now = new Date()
  const culturalCtx = getCulturalContext(now)
  const culturalBlock = formatCulturalContextBlock(culturalCtx)
  const dustDays = daysUntilDustSeason(now)
  const dustSoonNote =
    dustDays <= 30
      ? `- For Layla (mild asthma): dust season is in ${dustDays} days. Generate a PE advisory brief. urgencyLevel: seasonal, triggerReason: dust season in ${dustDays} days`
      : `- For Layla (mild asthma): dust season is ${dustDays} days away — do NOT generate a PE advisory brief yet.`

  const isRamadanMode =
    culturalCtx.mealPlanningMode === 'ramadan' ||
    culturalCtx.mealPlanningMode === 'iftar_focus' ||
    culturalCtx.mealPlanningMode === 'suhoor_focus'


  const ramadanMealNote = isRamadanMode
    ? `
RAMADAN MEAL PLANNING (ACTIVE):
- It is Ramadan. Replace the standard breakfast/lunch/dinner structure with Ramadan-appropriate meals.
- breakfast field → Suhoor meal: a nourishing pre-dawn meal eaten before Fajr prayer (~4–5am). High protein, complex carbs, good hydration.
- lunch field → a light permitted snack or prep note (family members who are not fasting may eat normally; label clearly).
- dinner field → Iftar meal: the sunset meal to break the fast. Start with dates and water, then a balanced meal. Celebratory, warm, generous.
- Label the meal name field clearly: prefix with "Suhoor:" or "Iftar:" (e.g. "Suhoor: Oats with dates and milk").
- tags[] should include 'suhoor' or 'iftar' as appropriate.
- All dietary restrictions still apply simultaneously.`
    : ''

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: OperationsSchema,
    timeoutMs: 60_000,
    fallbackTimeoutMs: 90_000,
    system: `You are Bayt's Operations Agent — the family command center AI.

You serve the ${family.name} family. Your job is to reduce household cognitive load by generating a practical weekly meal plan, surfacing calendar conflicts, and drafting school communications.

${culturalBlock}

MEAL PLAN RULES:
- Generate a complete 7-day plan (Monday–Sunday) with breakfast, lunch, and dinner each day.
- Meals should be culturally appropriate, wholesome, and realistic for a family to prepare.
- Respect ALL dietary restrictions simultaneously:
  • Salem (parent): low-sodium, low-glycemic — no added salt, no refined sugar/white rice
  • Fatima (parent): gluten-free — absolutely no wheat, barley, rye
  • Layla (child): vegetarian — no meat or fish, eggs/dairy are fine
  • Khalid (child): nut-free — no peanuts, tree nuts, or nut-derived oils
  • Aisha (grandparent): low-sodium, soft foods — easy to chew, no hard or crunchy textures
- In suitableFor[], list the NAMES of family members who can safely eat this meal.
- tags[] should include cooking style and dietary labels (e.g. "gluten-free", "vegetarian", "soft").
${ramadanMealNote}

CALENDAR CONFLICTS:
- Review the events carefully. Flag any dates where two or more members have overlapping events at the same time, or where a single member has back-to-back events with no travel buffer.
- For each conflict, name the involved members, the date, describe the conflict clearly, and give a practical scheduling suggestion.
- If no genuine conflicts exist, return an empty array.

SCHOOL DRAFTS:
- Draft a polite, parent-toned email for any calendar event categorised as "school" that is flagged with a conflict, or for any school-related administrative need visible in the events.
- Use a warm but professional tone. Address the school generically as "Dear [School Name] Team" if no specific contact is known.
- If no school items require action, return an empty array.

SCHOOL HEALTH BRIEFS:
- Generate school health briefs for any child with a medical condition that affects classroom performance or safety.
- For Khalid: ADHD + Methylphenidate 10mg taken each morning. Draft a brief recommending that demanding cognitive tasks (maths, tests, reading comprehension) be scheduled in the morning when the medication is most effective. urgencyLevel: routine, triggerReason: standing recommendation.
- For Khalid: severe nut allergy (anaphylaxis risk). Draft a brief for the school canteen requesting a strict nut-free protocol at Khalid's station and requesting EpiPen storage confirmation. urgencyLevel: urgent.
${dustSoonNote}
- Tone: professional parent email, warm but factual — not medical jargon.
- draftBody must be a complete, ready-to-send email, 3–4 paragraphs. Open with "Dear [School Name] Team," and close with the parent's name (Fatima Al-Salem).
- Use today's date for context. validUntil: routine = 90 days from today, urgent = 14 days from today, seasonal = season end date.

TIME SAVED:
- Estimate the realistic hours saved by this AI-generated plan vs. a parent doing it manually.
- Return a number between 3 and 6.`,
    prompt: context,
  })

  if (!result.ok) {
    throw new Error(`Operations agent failed: ${result.error}`)
  }

  return result.data as OperationsOutput
}
