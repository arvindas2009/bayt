import type { DayPlan, MealSubstitution, MealSummary } from '@/types/agents'
import {
  isCompliant,
  isHalal,
  violatedConstraints,
  violationFor,
  type Constraint,
  type MemberConstraints,
} from './constraints'
import { templatesFor, type MealSlot, type MealTemplate } from './library'

/**
 * Deterministic post-generation check. "Respects every member's diet" is a headline claim, so it
 * is enforced in code rather than hoped for from a prompt:
 *
 *  1. A dish that is not halal is replaced outright.
 *  2. For every member, we recompute whether the dish is compliant from its ingredients.
 *     `suitableFor` is overwritten with that answer (the LLM's own list is ignored).
 *  3. Each excluded member gets a named substitute from the Gulf meal library that satisfies
 *     all of their constraints.
 */

export interface PlanChange {
  day: string
  slot: MealSlot
  memberId: string
  dish: string
  reason: string
  substitute: string | null
}

export interface ValidationReport {
  plan: DayPlan[]
  changes: PlanChange[]
  /** Dishes replaced wholesale (not halal). */
  replacedDishes: { day: string; slot: MealSlot; dish: string; term: string }[]
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

function findSubstitute(slot: MealSlot, constraints: Constraint[], avoid: string, seed = 0): MealTemplate | undefined {
  // Every compliant alternative, in stable library order. `seed` rotates through them so the same
  // person is not handed the same substitute all week, while the result stays deterministic.
  const pool = templatesFor(slot).filter((t) => t.name !== avoid && isCompliant(t, constraints))
  return pool.length > 0 ? pool[seed % pool.length] : undefined
}

function toSummary(t: MealTemplate): MealSummary {
  return { name: t.name, tags: t.tags, calories: t.calories, suitableFor: [], ingredients: t.ingredients }
}

export function validatePlan(plan: DayPlan[], members: MemberConstraints[]): ValidationReport {
  const changes: PlanChange[] = []
  const replacedDishes: ValidationReport['replacedDishes'] = []
  const everyone = [...new Set(members.flatMap((m) => m.constraints))]

  const fixed = plan.map((day, dayIndex) => {
    const next = { ...day } as DayPlan

    for (const slot of SLOTS) {
      const seed = dayIndex * 3 + SLOTS.indexOf(slot)
      let meal: MealSummary = { ...day[slot] }

      if (!isHalal(meal)) {
        const term = violationFor(meal, 'halal') ?? 'non-halal ingredient'
        replacedDishes.push({ day: day.day, slot, dish: meal.name, term })
        const replacement = findSubstitute(slot, everyone, meal.name, seed) ?? findSubstitute(slot, [], meal.name, seed)
        if (replacement) meal = toSummary(replacement)
      }

      const suitableFor: string[] = []
      const substitutions: MealSubstitution[] = []

      for (const member of members) {
        const broken = violatedConstraints(meal, member.constraints)
        if (broken.length === 0) {
          suitableFor.push(member.memberId)
          continue
        }
        const reason = broken.map((v) => `${v.constraint.replace(/_/g, '-')} (${v.term})`).join(', ')
        const sub = findSubstitute(slot, member.constraints, meal.name, seed + members.indexOf(member))
        changes.push({
          day: day.day, slot, memberId: member.memberId, dish: meal.name, reason, substitute: sub?.name ?? null,
        })
        if (sub) substitutions.push({ memberId: member.memberId, name: sub.name, ingredients: sub.ingredients, reason })
      }

      next[slot] = {
        ...meal,
        suitableFor,
        substitutions: substitutions.length > 0 ? substitutions : undefined,
      }
    }
    return next
  })

  return { plan: fixed, changes, replacedDishes }
}

/** True when every member can eat, or has a named substitute for, every meal in the plan. */
export function planCoversEveryone(plan: DayPlan[], members: MemberConstraints[]): boolean {
  return plan.every((day) =>
    SLOTS.every((slot) => {
      const meal = day[slot]
      return members.every(
        (m) =>
          meal.suitableFor.includes(m.memberId) ||
          meal.substitutions?.some((s) => s.memberId === m.memberId),
      )
    }),
  )
}
