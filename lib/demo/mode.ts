/**
 * Demo mode (NEXT_PUBLIC_DEMO_MODE=true) runs the app with no model calls at all.
 *
 * It does not serve canned data: the same deterministic code (load model, ranking, conflict
 * detection, school briefs, built-in Emirati meal plan) runs against the seeded database, so a demo
 * is as truthful as the live app, just without AI-written wording.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
