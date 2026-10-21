import type { DayPlan, MealSummary } from '@/types/agents'
import { isCompliant, type MemberConstraints } from './constraints'
import { templatesFor, type MealSlot, type MealTemplate } from './library'
import { validatePlan, type ValidationReport } from './validate'

/**
 * Hand-built weekly plan used when the LLM is unavailable (and as a quality floor in demos).
 * Varied across the week, Gulf home cooking, and run through the same validator as live output
 * so Layla, Khalid, Fatima and the low-sodium / low-glycemic members are all covered.
 */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

/** Order templates so ones that suit the most members come first; stable within each tier. */
function rankedPool(slot: MealSlot, members: MemberConstraints[]): MealTemplate[] {
  const score = (t: MealTemplate) => members.filter((m) => isCompliant(t, m.constraints)).length
  return templatesFor(slot)
    .map((t, i) => ({ t, i, s: score(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t)
}

function slotPrefix(slot: MealSlot, ramadan: boolean): string {
  if (!ramadan) return ''
  return slot === 'breakfast' ? 'Suhoor: ' : slot === 'lunch' ? 'Iftar starter: ' : 'Iftar: '
}

export function buildFallbackPlan(members: MemberConstraints[], opts: { ramadan?: boolean } = {}): ValidationReport {
  const ramadan = opts.ramadan ?? false

  // Keep the best-fitting part of each pool for variety without drifting to dishes few people can eat.
  const pools = Object.fromEntries(
    SLOTS.map((slot) => {
      const ranked = rankedPool(slot, members)
      return [slot, ranked.slice(0, Math.max(7, Math.ceil(ranked.length * 0.7)))]
    }),
  ) as Record<MealSlot, MealTemplate[]>

  const plan: DayPlan[] = DAYS.map((day, i) => {
    const pick = (slot: MealSlot): MealSummary => {
      // Offset each slot so the same dish never sits in the same position two days running.
      const pool = pools[slot]
      const t = pool[(i + SLOTS.indexOf(slot) * 2) % pool.length]
      return {
        name: `${slotPrefix(slot, ramadan)}${t.name}`,
        tags: t.tags,
        calories: t.calories,
        suitableFor: [],
        ingredients: t.ingredients,
      }
    }
    return { day, breakfast: pick('breakfast'), lunch: pick('lunch'), dinner: pick('dinner') }
  })

  return validatePlan(plan, members)
}
