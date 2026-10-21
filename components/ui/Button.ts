/**
 * The two button looks. Primary is the one action a page is for (solid lime); secondary is
 * everything else. Keep at most one primary per header so the eye knows where to go.
 */
const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm transition-[transform,background-color,color,opacity] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:pointer-events-none disabled:opacity-40'

export const BUTTON_PRIMARY = `${BASE} bg-[var(--sand)] px-4 py-2 font-semibold text-[var(--on-sand)] hover:-translate-y-0.5`

export const BUTTON_SECONDARY = `${BASE} border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]`
