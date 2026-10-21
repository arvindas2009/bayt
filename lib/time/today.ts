import { addDays, startOfDay } from 'date-fns'

/**
 * The one place the app asks "what day is it?".
 *
 * Everything that reasons about time (seed, load model, cultural context, agents) goes through
 * here so a demo date override can be added in one spot later without touching call sites.
 */
export function getToday(): Date {
  const sim = getSimDate()
  return sim ? new Date(sim.getTime()) : new Date()
}

/**
 * Demo date simulator. One override per runtime (server process, browser tab), held on globalThis
 * so duplicated module instances still agree. Only ever set in demo mode (`/api/sim`, SimDateGate).
 */
const SIM_KEY = '__baytSimDate'
type SimHolder = { [SIM_KEY]?: Date | null }

export function getSimDate(): Date | null {
  return (globalThis as SimHolder)[SIM_KEY] ?? null
}

/** Pass an ISO day ("2027-02-12") or null to return to the real date. Pinned to local noon. */
export function setSimDate(iso: string | null): void {
  const holder = globalThis as SimHolder
  if (!iso) {
    holder[SIM_KEY] = null
    return
  }
  const [y, m, d] = iso.split('-').map(Number)
  holder[SIM_KEY] = new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

/** Local calendar day boundary for `getToday()` (or a supplied date). */
export function getStartOfToday(now: Date = getToday()): Date {
  return startOfDay(now)
}

/**
 * A moment `dayOffset` days from today at a local "HH:mm" wall-clock time.
 * Used to seed data relative to the current date instead of freezing it in one month.
 */
export function at(dayOffset: number, time = '09:00', base: Date = getToday()): Date {
  const [h, m] = time.split(':').map(Number)
  const d = addDays(startOfDay(base), dayOffset)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

export function atISO(dayOffset: number, time = '09:00', base: Date = getToday()): string {
  return at(dayOffset, time, base).toISOString()
}

/** Whole days from `from` to `to` (negative when `to` is earlier), by calendar day. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}
