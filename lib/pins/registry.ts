import { CalendarHeart, CalendarX2, FileInput, Pill, Scale, School, ShieldAlert, UtensilsCrossed, type LucideIcon } from 'lucide-react'

/** Everything a person can pin to their Briefing. Each one opens the page it comes from. */
export const PIN_IDS = ['load-scores', 'clashes', 'meals-today', 'drop', 'appointments', 'medications', 'school', 'stress-test'] as const
export type PinId = (typeof PIN_IDS)[number]

export type PinTone = 'sand' | 'ember' | 'dusk' | 'zest' | 'palm'

export interface PinMeta {
  id: PinId
  title: string
  /** One line for the "Add" menu. */
  hint: string
  icon: LucideIcon
  tone: PinTone
  href: string
}

export const PINS: Record<PinId, PinMeta> = {
  'load-scores': { id: 'load-scores', title: 'Load scores', hint: 'Who carries the most this week', icon: Scale, tone: 'sand', href: '/load' },
  clashes: { id: 'clashes', title: 'Calendar clashes', hint: 'Two things at once, and a fix', icon: CalendarX2, tone: 'ember', href: '/operations' },
  'meals-today': { id: 'meals-today', title: "Today's meals", hint: 'Breakfast, lunch and dinner', icon: UtensilsCrossed, tone: 'zest', href: '/operations?tab=meals' },
  drop: { id: 'drop', title: 'Drop anything', hint: 'Turn a document into a task', icon: FileInput, tone: 'dusk', href: '/operations?tab=inbox' },
  appointments: { id: 'appointments', title: 'Appointments', hint: 'The next few visits', icon: CalendarHeart, tone: 'palm', href: '/health' },
  medications: { id: 'medications', title: 'Medications', hint: 'Who gives what, and gaps', icon: Pill, tone: 'ember', href: '/health' },
  school: { id: 'school', title: 'School notes', hint: 'Emails and health notes to send', icon: School, tone: 'dusk', href: '/operations?tab=school' },
  'stress-test': { id: 'stress-test', title: 'Stress test', hint: 'What breaks if someone is away', icon: ShieldAlert, tone: 'ember', href: '/load#resilience' },
}

/** Shown on an empty board as one-click starters. */
export const SUGGESTED_PINS: PinId[] = ['meals-today', 'clashes', 'drop']

export const isPinId = (v: string): v is PinId => (PIN_IDS as readonly string[]).includes(v)
