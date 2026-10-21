import type { FamilyMember } from '@/types/family'

/**
 * Diet constraints: the ONLY thing the meal agent and the validator know about a member.
 *
 * `deriveConstraints` reads dietary needs and conditions locally and emits abstract constraints.
 * Diagnoses and medication names never leave this module, which is the privacy-by-design
 * boundary for the Operations agent: it sees "low_glycemic", not "Type 2 Diabetes".
 */

export type Constraint =
  | 'vegetarian'
  | 'nut_free'
  | 'gluten_free'
  | 'low_sodium'
  | 'low_glycemic'
  | 'soft_texture'

export const CONSTRAINT_LABELS: Record<Constraint, string> = {
  vegetarian: 'Vegetarian (no meat or fish)',
  nut_free: 'Nut-free (no nuts, peanuts or traces)',
  gluten_free: 'Gluten-free (no wheat, barley, semolina)',
  low_sodium: 'Low sodium',
  low_glycemic: 'Low glycemic (no added sugar or syrup)',
  soft_texture: 'Soft textures',
}

export interface MemberConstraints {
  memberId: string
  name: string
  constraints: Constraint[]
}

type MemberDietInput = Pick<FamilyMember, 'id' | 'name' | 'dietaryNeeds' | 'healthProfile'>

export function deriveConstraints(member: MemberDietInput): Constraint[] {
  const needs = member.dietaryNeeds.join(' | ')
  const conditions = (member.healthProfile?.conditions ?? []).join(' | ')
  const out = new Set<Constraint>()

  if (/vegetarian|vegan/i.test(needs)) out.add('vegetarian')
  if (/nut/i.test(needs) || /nut allergy/i.test(conditions)) out.add('nut_free')
  if (/gluten|celiac|coeliac/i.test(needs) || /gluten|celiac|coeliac/i.test(conditions)) out.add('gluten_free')
  if (/low.?sodium|low.?salt/i.test(needs) || /hypertension|high blood pressure/i.test(conditions)) out.add('low_sodium')
  if (/low.?glyc|diabet/i.test(needs) || /diabet/i.test(conditions)) out.add('low_glycemic')
  if (/soft/i.test(needs)) out.add('soft_texture')

  return [...out]
}

export function familyConstraints(members: MemberDietInput[]): MemberConstraints[] {
  return members.map((m) => ({ memberId: m.id, name: m.name, constraints: deriveConstraints(m) }))
}

// ── Keyword checks ───────────────────────────────────────────────────────────────

/** Terms that break each constraint. Matched as whole words against meal name + ingredients. */
export const FORBIDDEN: Record<Constraint | 'halal', string[]> = {
  vegetarian: [
    'chicken', 'lamb', 'beef', 'mutton', 'meat', 'minced meat', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'prawns',
    'hammour', 'kingfish', 'sardine', 'sardines', 'anchovy', 'anchovies', 'camel', 'turkey', 'liver',
    'seafood', 'crab', 'lobster', 'gelatin', 'bone broth',
  ],
  nut_free: [
    'nut', 'nuts', 'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pistachio',
    'pistachios', 'hazelnut', 'hazelnuts', 'pecan', 'pecans', 'pine nuts', 'marzipan', 'praline', 'nutella',
    'baklava', 'maamoul',
  ],
  gluten_free: [
    'wheat', 'flour', 'bread', 'breadcrumbs', 'khubz', 'pita', 'regag', 'chapati', 'paratha', 'couscous', 'barley',
    'semolina', 'pasta', 'noodle', 'noodles', 'vermicelli', 'bulgur', 'freekeh', 'harees', 'oats', 'oat', 'cracker',
    'crackers', 'dough', 'pastry', 'samoon', 'tabbouleh', 'sambousek', 'samosa', 'pancake', 'pancakes', 'chebab',
    'luqaimat', 'thareed',
  ],
  low_sodium: [
    'salted', 'pickle', 'pickles', 'pickled', 'cured', 'stock cube', 'bouillon', 'soy sauce', 'olives', 'olive brine',
    'halloumi', 'feta', 'processed cheese', 'canned', 'brined', 'salted fish', 'salted cheese', 'tinned',
  ],
  low_glycemic: [
    'sugar', 'syrup', 'date syrup', 'dibs', 'honey', 'jam', 'sweetened', 'candied', 'dates', 'date', 'caramel',
    'white bread', 'fries', 'cake', 'dessert', 'condensed milk', 'jaggery', 'muhammar',
  ],
  soft_texture: ['crunchy', 'crispy', 'crusty', 'raw vegetables', 'popcorn', 'tough', 'chips', 'seeds'],
  halal: ['pork', 'bacon', 'ham', 'lard', 'alcohol', 'wine', 'beer', 'rum', 'pancetta', 'prosciutto', 'gelatin'],
}

const regexCache = new Map<string, RegExp>()

function regexFor(key: Constraint | 'halal'): RegExp {
  let re = regexCache.get(key)
  if (!re) {
    // Longest first so "pine nuts" wins over "nuts"; word boundaries so "coconut"/"nutmeg" don't match "nut".
    const terms = [...FORBIDDEN[key]].sort((a, b) => b.length - a.length).map((t) => t.replace(/\s+/g, '\\s+'))
    re = new RegExp(`\\b(${terms.join('|')})\\b`, 'i')
    regexCache.set(key, re)
  }
  return re
}

export interface MealLike {
  name: string
  ingredients?: string[]
}

/**
 * Remove explicit "X-free" / "no added sugar" labels before matching, so "vermicelli-free",
 * "gluten-free flour" and "no added salt" are not read as the very thing they disclaim. The label
 * and the word it modifies are dropped together. This trusts a *specific* label ("gluten-free
 * flour") but never a bare claim: a dish named "gluten-free" whose ingredients say "wheat" still fails.
 */
function stripDisclaimers(text: string): string {
  return text
    .replace(/\b[\w'’]+[- ]free\b(?:\s+[\w'’]+)?/gi, ' ')
    .replace(/\b(?:no|without|low|reduced|unsalted)[- ](?:added[- ])?(?:sugar|salt|sodium)\b/gi, ' ')
}

function mealText(meal: MealLike): string {
  // Parentheses in a dish name are qualifiers ("(vermicelli-free: saffron rice)"), not the dish.
  const name = meal.name.replace(/\([^)]*\)/g, ' ')
  return [name, ...(meal.ingredients ?? [])].map(stripDisclaimers).join(' , ')
}

/** The first term that breaks `constraint`, or null when the meal is fine. */
export function violationFor(meal: MealLike, constraint: Constraint | 'halal'): string | null {
  const match = regexFor(constraint).exec(mealText(meal))
  return match ? match[1].toLowerCase() : null
}

export function violatedConstraints(meal: MealLike, constraints: Constraint[]): { constraint: Constraint; term: string }[] {
  const out: { constraint: Constraint; term: string }[] = []
  for (const c of constraints) {
    const term = violationFor(meal, c)
    if (term) out.push({ constraint: c, term })
  }
  return out
}

export function isCompliant(meal: MealLike, constraints: Constraint[]): boolean {
  return constraints.every((c) => !violationFor(meal, c))
}

export function isHalal(meal: MealLike): boolean {
  return !violationFor(meal, 'halal')
}
