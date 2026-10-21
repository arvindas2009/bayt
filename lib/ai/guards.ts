/**
 * Cheap, deterministic checks on model-written prose.
 *
 * The briefing's numbers (hours, scores, times) are computed in code. A model may rephrase around
 * them, but it must not change them or invent new ones: a single wrong figure ("nearly triple the
 * next person's load" when the real ratio is 2.2x) is exactly what makes people distrust every
 * other number on the screen. These guards let us accept the wording only when the facts survive.
 */

const numbersIn = (text: string): string[] => text.match(/\d+(?:\.\d+)?/g) ?? []

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const toLatinDigits = (text: string) => text.replace(/[٠-٩]/g, (c) => String(ARABIC_INDIC.indexOf(c)))

/**
 * An Arabic rendering that invented no figure. Arabic often spells times out in words ("التاسعة"),
 * so unlike English rewrites it may drop a digit but never add one (either digit script).
 */
export function arabicKeepsFacts(source: string, arabic: string): boolean {
  return addsNoNumbers(toLatinDigits(arabic), source)
}

/** Every number in `original` still appears in `rewritten` (a rephrase kept its facts). */
export function keepsNumbers(original: string, rewritten: string): boolean {
  return numbersIn(original).every((n) => rewritten.includes(n))
}

/** `text` contains no number that is absent from `facts` (the model did not invent a figure). */
export function addsNoNumbers(text: string, facts: string): boolean {
  const allowed = new Set(numbersIn(facts))
  return numbersIn(text).every((n) => allowed.has(n))
}

/**
 * A rephrase that neither dropped nor added a figure, and did not balloon into something longer
 * (the usual sign a model has started inventing detail or narrating a scene around the fact).
 */
export function isFaithfulRewrite(original: string, rewritten: string): boolean {
  const withinLength = rewritten.length <= original.length * 1.5 + 30
  return withinLength && keepsNumbers(original, rewritten) && addsNoNumbers(rewritten, original)
}

/** Comparative words that smuggle in arithmetic the model was not given. */
const COMPARATIVES = /\b(double|doubled|triple|tripled|twice|thrice|times|half|quarter|fold|multiple)\b/i

/** Prose written from a fixed list of facts: no new numbers and no unearned comparisons. */
export function isFaithfulNarrative(text: string, facts: string): boolean {
  return addsNoNumbers(text, facts) && !COMPARATIVES.test(text)
}
