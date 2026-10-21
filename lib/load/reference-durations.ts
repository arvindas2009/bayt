/**
 * Reference durations for household tasks, in minutes per occurrence.
 *
 * These are PLANNING ASSUMPTIONS, not measurements. They exist so every hour Bayt shows
 * (Invisible Hours, load score, Time Dividend) is computed from one documented table instead of
 * being guessed by an LLM. Adjust a number here and every screen follows.
 *
 * basis:
 *  - 'assumption'  our own planning figure, chosen to be conservative
 *  - 'travel'      dominated by round-trip travel time in UAE urban commuting
 */

export type LoadCategory = 'medical' | 'school' | 'admin' | 'logistics' | 'meals' | 'social'

export interface ReferenceDuration {
  minutes: number
  category: LoadCategory
  basis: 'assumption' | 'travel'
  note: string
}

export const REFERENCE_DURATIONS = {
  // ── Appointments & health ────────────────────────────────────────────────────
  appointment_escort: { minutes: 120, category: 'medical', basis: 'travel', note: 'Drive, wait, drive back, follow-up notes' },
  medication_dose: { minutes: 5, category: 'medical', basis: 'assumption', note: 'Prepare, prompt and confirm one dose for someone else' },
  refill: { minutes: 40, category: 'medical', basis: 'assumption', note: 'Pharmacy visit or delivery coordination' },
  lab_visit: { minutes: 45, category: 'medical', basis: 'assumption', note: 'Own lab visit, including fasting logistics' },

  // ── School ───────────────────────────────────────────────────────────────────
  school_run: { minutes: 35, category: 'school', basis: 'travel', note: 'Round trip including queueing at the gate' },
  school_meeting: { minutes: 60, category: 'school', basis: 'assumption', note: 'Parent–teacher conference or school meeting' },
  school_form: { minutes: 30, category: 'school', basis: 'assumption', note: 'Fill, sign and return a school form' },
  fee_payment: { minutes: 25, category: 'school', basis: 'assumption', note: 'Check invoice, pay, file the receipt' },

  // ── Admin & residency ────────────────────────────────────────────────────────
  renewal: { minutes: 150, category: 'admin', basis: 'assumption', note: 'Gather documents, typing-centre or app steps, medical/biometrics where needed' },
  bill: { minutes: 15, category: 'admin', basis: 'assumption', note: 'Pay a utility or top up an account' },
  paperwork: { minutes: 60, category: 'admin', basis: 'assumption', note: 'General household paperwork' },

  // ── Home & logistics ─────────────────────────────────────────────────────────
  errand: { minutes: 60, category: 'logistics', basis: 'travel', note: 'Single errand with travel' },
  chores: { minutes: 60, category: 'logistics', basis: 'assumption', note: 'Grocery run or household task' },
  travel_support: { minutes: 30, category: 'logistics', basis: 'assumption', note: 'Cover the household while a member is away' },
  conflict_resolution: { minutes: 30, category: 'logistics', basis: 'assumption', note: 'Notice a clash, negotiate who goes, message everyone' },

  // ── Meals ────────────────────────────────────────────────────────────────────
  meal_planning: { minutes: 90, category: 'meals', basis: 'assumption', note: 'Plan a week around every diet, then write the shopping list' },
  meal_prep: { minutes: 45, category: 'meals', basis: 'assumption', note: 'Cook one family dinner' },

  // ── Communication (also used for Time Dividend) ──────────────────────────────
  draft_message: { minutes: 12, category: 'school', basis: 'assumption', note: 'Write and proof one school / provider email' },
  handoff_coordination: { minutes: 20, category: 'logistics', basis: 'assumption', note: 'Agree who takes a task and tell everyone involved' },

  // ── Fallback ─────────────────────────────────────────────────────────────────
  generic: { minutes: 30, category: 'logistics', basis: 'assumption', note: 'Unclassified task' },
} as const satisfies Record<string, ReferenceDuration>

export type TaskType = keyof typeof REFERENCE_DURATIONS

export function referenceFor(taskType: string): ReferenceDuration {
  return (REFERENCE_DURATIONS as Record<string, ReferenceDuration>)[taskType] ?? REFERENCE_DURATIONS.generic
}

/**
 * Weekly capacity (hours of unpaid household coordination) that maps to a load score of 100.
 * A planning assumption: roughly half a working week on top of a paid job.
 */
export const WEEKLY_CAPACITY_HOURS = 20

/** A load score at or above this is "burnout risk". */
export const BURNOUT_THRESHOLD = 75

/**
 * Reference figure for a typical household's invisible coordination per week, used only for the
 * "above typical" comparison. A planning assumption, labelled as such wherever it is shown.
 */
export const BASELINE_WEEKLY_HOURS = 12

export const LOAD_CATEGORY_LABELS: Record<LoadCategory, string> = {
  medical: 'Medical',
  school: 'School',
  admin: 'Admin & residency',
  logistics: 'Logistics',
  meals: 'Meals',
  social: 'Social',
}
