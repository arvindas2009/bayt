import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns'
import { computeLoad, REST_LOOKBACK_DAYS, type LoadReport } from '@/lib/load/model'
import { BURNOUT_THRESHOLD, WEEKLY_CAPACITY_HOURS } from '@/lib/load/reference-durations'
import { buildPriorityItems, priorityFor, type PriorityItem } from '@/lib/briefing/rank'
import { describeConflict, detectConflicts, nameOf } from '@/lib/ops/conflicts'
import { assessResilience, simulateAbsence } from '@/lib/resilience/simulate'
import { upcomingAppointments } from '@/lib/health/appointments'
import type { Family, FamilyMember } from '@/types/family'
import type { SourceRef } from '@/types/agents'

/**
 * The fact sheet behind "Ask Bayt": everything the chat may say, written by code.
 *
 * Every figure comes from the deterministic modules the dashboard already shows (load model,
 * ranking, conflicts, resilience), so the chat can never disagree with a screen. The model only
 * picks facts and phrases an answer; it is never told a condition, a medication name, a dose or a
 * lab value. Titles that mention any of those (seen in the family's own health data) are replaced
 * with a generic label before they reach the sheet.
 */

export type FactTopic =
  | 'viewer' | 'load' | 'priority' | 'conflict' | 'calendar' | 'obligation'
  | 'handoff' | 'resilience' | 'health' | 'time' | 'app'

export interface Fact {
  id: string
  topic: FactTopic
  text: string
  /** Members the fact is about, so the no-model path can match "what about Layla?". */
  memberIds: string[]
  sources: SourceRef[]
}

export interface FactSheet {
  facts: Fact[]
  /** The sheet as the model reads it: one `[F1] …` line per fact. */
  text: string
  viewer: FamilyMember
  /** Matches any condition or medication word of this family; null when there are none. */
  sensitive: RegExp | null
}

export interface DividendFacts {
  hours: number
  lines: { label: string; count: number; minutes: number }[]
}

/** Days simulated for the "what if someone is away" facts (the Load page's default). */
export const ABSENCE_DAYS = 14
const CALENDAR_DAYS = 7
const MAX_CALENDAR_FACTS = 30
const MAX_PRIORITY_FACTS = 6
/** Event categories whose titles never reach the model. */
const MEDICAL = ['medical', 'health']

// ── Privacy: words that would reveal a condition or a medication ─────────────────────

/** Words too common to treat as health terms ("Mild Asthma" is caught by "asthma"). */
const COMMON = new Set(['type', 'mild', 'severe', 'sensitivity', 'deficiency', 'decline', 'iron', 'vitamin', 'auto', 'daily', 'and', 'the', 'with'])

/**
 * A pattern for this family's condition and medication words, cut to a stem so "allergy" also
 * catches "allergies" and "diabetes" catches "diabetic". It over-matches on purpose: hiding an
 * innocent title is cheap, leaking a diagnosis is not.
 */
export function sensitivePattern(family: Pick<Family, 'members'>): RegExp | null {
  const stems = new Set<string>()
  for (const m of family.members) {
    const phrases = [...(m.healthProfile?.conditions ?? []), ...m.medications.map((med) => med.name)]
    for (const word of phrases.join(' ').toLowerCase().split(/[^a-z]+/)) {
      if (word.length >= 3 && !COMMON.has(word)) stems.add(word.slice(0, 6))
    }
  }
  return stems.size ? new RegExp(`\\b(${[...stems].join('|')})`, 'i') : null
}

export const isSensitive = (text: string, pattern: RegExp | null) => Boolean(pattern?.test(text))

// ── Wording helpers ────────────────────────────────────────────────────────────────

function names(members: FamilyMember[], ids: string[]): string {
  const list = [...new Set(ids)].map((id) => nameOf(members, id))
  if (list.length <= 1) return list[0] ?? 'nobody'
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/** "today (Wednesday 22 October)", "tomorrow (…)", or the date; the year only when it differs. */
function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso)
  const date = format(d, d.getFullYear() === now.getFullYear() ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy')
  const diff = differenceInCalendarDays(d, now)
  if (diff === 0) return `today (${date})`
  if (diff === 1) return `tomorrow (${date})`
  return date
}

const atTime = (iso: string, now: Date) => `${dayLabel(iso, now)} at ${format(new Date(iso), 'HH:mm')}`

const backupsOf = (ownerId: string, ids: string[] | undefined) => (ids ?? []).filter((id) => id !== ownerId)

// ── The sheet ──────────────────────────────────────────────────────────────────────

export function buildFactSheet(
  family: Family,
  now: Date,
  viewerId: string,
  dividend?: DividendFacts | null,
): FactSheet {
  const members = family.members
  const viewer = members.find((m) => m.id === viewerId) ?? members[0]
  const sensitive = sensitivePattern(family)
  // A health appointment's title can say what it is for ("Paediatrician follow-up (growth)"), so it
  // is renamed wherever a clash, priority or gap quotes it. Longest first, so no title is cut short.
  const medicalTitles = [
    ...new Set(members.flatMap((m) => m.calendarEvents).filter((e) => MEDICAL.includes(e.category)).map((e) => e.title)),
  ].sort((a, b) => b.length - a.length)
  const safe = (text: string, generic: string) => {
    const renamed = medicalTitles.reduce((t, title) => t.split(title).join('medical appointment'), text)
    return isSensitive(renamed, sensitive) ? generic : renamed
  }

  const facts: Fact[] = []
  const add = (topic: FactTopic, text: string, memberIds: string[] = [], sources: SourceRef[] = []) =>
    facts.push({ id: `F${facts.length + 1}`, topic, text, memberIds: [...new Set(memberIds)], sources })

  const load = computeLoad(family, now)
  const items = buildPriorityItems(family, now, load)

  // Who is asking, and when.
  add(
    'viewer',
    `Today is ${format(now, 'EEEE d MMMM yyyy')}. The person asking is ${viewer.name} (${viewer.role}, age ${viewer.age}); "I", "me" and "my" mean ${viewer.name}. ` +
      `The ${family.name} family: ${members.map((m) => `${m.name} (${m.role}, ${m.age})`).join(', ')}.`,
    [viewer.id],
  )

  addLoadFacts(add, load, members)
  addPriorityFacts(add, items, viewer, members, now, safe)

  for (const c of detectConflicts(family, now)) {
    const { conflict, suggestion } = describeConflict(c, family, now)
    const text = `Clash: ${conflict}. ${suggestion}`
    add(
      'conflict',
      safe(text, `Clash: ${names(members, c.responsibleIds)} ${c.responsibleIds.length > 1 ? 'have' : 'has'} two commitments ${atTime(c.at, now)}, one of them private.`),
      c.responsibleIds,
      c.events.map((e) => ({ type: 'event' as const, id: e.id })),
    )
  }

  addCalendarFacts(add, members, now, safe)
  addObligationFacts(add, family, members, now, safe)

  for (const h of (family.handoffs ?? []).filter((x) => x.status === 'pending')) {
    const what = safe(h.itemTitle, h.itemType === 'medication' ? 'a medication schedule' : 'a task with private details')
    const reason = h.reason && !isSensitive(h.reason, sensitive) ? ` Reason given: ${h.reason}` : ''
    add(
      'handoff',
      `${nameOf(members, h.fromId)} asked ${nameOf(members, h.toId)} to take over "${what}". It waits for ${nameOf(members, h.toId)}'s answer in the inbox; nothing moves without consent.${reason}`,
      [h.fromId, h.toId],
      [{ type: 'handoff', id: h.id }],
    )
  }

  addResilienceFacts(add, family, load, members, now, safe)
  addHealthFacts(add, members, now)

  if (dividend && dividend.hours > 0) {
    const lines = dividend.lines.map((l) => `${l.label}: ${l.count}, ${l.minutes} minutes`).join('; ')
    add('time', `Time given back by Bayt (Time Dividend): ${dividend.hours} hours${lines ? `, made of ${lines}` : ''}. Counted from what Bayt did, times the reference durations.`)
  }

  for (const text of APP_FACTS) add('app', text)

  return { facts, text: facts.map((f) => `[${f.id}] ${f.text}`).join('\n'), viewer, sensitive }
}

type Add = (topic: FactTopic, text: string, memberIds?: string[], sources?: SourceRef[]) => void
type Safe = (text: string, generic: string) => string

function addLoadFacts(add: Add, load: LoadReport, members: FamilyMember[]) {
  const top = load.topMemberId ? nameOf(members, load.topMemberId) : 'nobody'
  add(
    'load',
    `Household load for the next 7 days (${format(new Date(load.windowStart), 'd MMMM')} to ${format(new Date(load.windowEnd), 'd MMMM')}): ${load.totalHours} hours in total; ${top} carries the most. ` +
      `A score of 100/100 means ${WEEKLY_CAPACITY_HOURS} hours of household work a week, and the burnout line is ${BURNOUT_THRESHOLD}/100. Hours are planning estimates from reference durations, not measurements.`,
    load.topMemberId ? [load.topMemberId] : [],
  )
  for (const m of [...load.members].sort((a, b) => b.hours - a.hours)) {
    const name = nameOf(members, m.memberId)
    const rest =
      m.daysWithoutRest >= REST_LOOKBACK_DAYS
        ? `no rest block in the last ${REST_LOOKBACK_DAYS} days`
        : `${m.daysWithoutRest} days since a rest block`
    const over = m.score >= BURNOUT_THRESHOLD ? ` ${name} is over the burnout line.` : ''
    add(
      'load',
      `${name}'s load: ${m.hours} hours in the next 7 days, ${m.score}/100, ${m.shareOfLoad}% of the family's load, ${rest}.${over}`,
      [m.memberId],
      load.items.filter((i) => i.ownerId === m.memberId).slice(0, 6).map((i) => ({ type: i.kind, id: i.id })),
    )
  }
}

function addPriorityFacts(add: Add, items: PriorityItem[], viewer: FamilyMember, members: FamilyMember[], now: Date, safe: Safe) {
  const describe = (item: PriorityItem) => {
    const text = `${item.action} If nothing is done: ${item.consequence}`
    const when = item.at ? `, due ${dayLabel(item.at, now)}` : ''
    return safe(text, `A task for ${names(members, item.personIds)} needs attention${when}. Its details are private.`)
  }
  items.slice(0, MAX_PRIORITY_FACTS).forEach((item, i) => {
    const label = i === 0 ? "The family's top priority today" : `Family priority ${i + 1}`
    add('priority', `${label} (${item.severity}): ${describe(item)}`, item.personIds, item.sources)
  })
  const mine = priorityFor(items, viewer.id)[0]
  add(
    'priority',
    mine ? `${viewer.name}'s own top item: ${describe(mine)}` : `Nothing ranked as urgent is on ${viewer.name}'s list right now.`,
    mine ? [viewer.id, ...mine.personIds] : [viewer.id],
    mine?.sources ?? [],
  )
}

function addCalendarFacts(add: Add, members: FamilyMember[], now: Date, safe: Safe) {
  const from = startOfDay(now)
  const to = addDays(from, CALENDAR_DAYS)
  const events = members
    .flatMap((m) => m.calendarEvents)
    // Health appointments are listed separately, without their titles.
    .filter((e) => !MEDICAL.includes(e.category))
    .filter((e) => new Date(e.date) >= from && new Date(e.date) < to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_CALENDAR_FACTS)

  for (const e of events) {
    const title = safe(e.title, 'a private event')
    const owner = e.ownerId
    const who = owner && owner !== e.memberId ? `, ${nameOf(members, owner)} is responsible` : ''
    const backups = owner ? backupsOf(owner, e.backupIds) : []
    const cover = owner ? (backups.length ? `, backup ${names(members, backups)}` : ', no backup') : ''
    add(
      'calendar',
      `${atTime(e.date, now)}: "${title}" (${e.category}) for ${nameOf(members, e.memberId)}${who}${cover}.`,
      [e.memberId, ...(owner ? [owner] : []), ...backups],
      [{ type: 'event', id: e.id }],
    )
  }
  if (events.length === 0) add('calendar', 'Nothing is on the calendar for the next 7 days.')
}

function addObligationFacts(add: Add, family: Family, members: FamilyMember[], now: Date, safe: Safe) {
  const open = (family.obligations ?? []).filter((o) => o.status === 'open').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  for (const o of open) {
    const backups = backupsOf(o.ownerId, o.backupIds)
    const cover = `${nameOf(members, o.ownerId)} is responsible${backups.length ? `, backup ${names(members, backups)}` : ', with no backup'}`
    const subject = o.subjectId ?? o.ownerId
    const full = `"${o.title}" (${o.category}) is due ${dayLabel(o.dueDate, now)}. ${cover}. If missed: ${o.consequence}`
    const generic = `A ${o.category === 'Health' ? 'health' : o.category.toLowerCase()} task for ${nameOf(members, subject)} is due ${dayLabel(o.dueDate, now)}. ${cover}. Its details are private.`
    add(
      'obligation',
      o.category === 'Health' ? generic : safe(full, generic),
      [o.ownerId, ...backups, ...(o.subjectId ? [o.subjectId] : [])],
      [{ type: 'obligation', id: o.id }],
    )
  }
}

function addResilienceFacts(add: Add, family: Family, load: LoadReport, members: FamilyMember[], now: Date, safe: Safe) {
  const r = assessResilience(load)
  add(
    'resilience',
    `Bus factor ${r.busFactor}: the fewest people any job this week depends on. ${r.singlePoints.length} of ${r.groups} jobs rest on one person with no backup.`,
    [],
    r.singlePoints.flatMap((p) => p.sources).slice(0, 8),
  )

  const byOwner = new Map<string, string[]>()
  for (const p of r.singlePoints) {
    const title = p.kind === 'medication' ? 'a medication schedule' : safe(p.title, 'a task with private details')
    byOwner.set(p.ownerId, [...new Set([...(byOwner.get(p.ownerId) ?? []), title])])
  }
  for (const [ownerId, titles] of byOwner) {
    add(
      'resilience',
      `Only ${nameOf(members, ownerId)} can do these this week (no backup): ${titles.join('; ')}.`,
      [ownerId],
      r.singlePoints.filter((p) => p.ownerId === ownerId).flatMap((p) => p.sources).slice(0, 8),
    )
  }

  // What the Load page's stress test would show for anyone who carries work.
  for (const m of load.members.filter((x) => x.hours > 0)) {
    const sim = simulateAbsence(family, m.memberId, ABSENCE_DAYS, now)
    const name = nameOf(members, m.memberId)
    const gaps = sim.failures.slice(0, 4).map((f) => {
      const title = f.kind === 'medication' ? 'a medication schedule' : safe(f.title, 'a task with private details')
      return `${title} (from ${dayLabel(addDays(startOfDay(now), f.day).toISOString(), now)})`
    })
    const strain = sim.coverLoad
      .filter((c) => c.scoreAfter > c.scoreBefore)
      .map((c) => `${nameOf(members, c.memberId)} would go from ${c.scoreBefore}/100 to ${c.scoreAfter}/100`)
    add(
      'resilience',
      `If ${name} were away for ${ABSENCE_DAYS} days: ${sim.failures.length} tasks would have nobody to do them${gaps.length ? ` (${gaps.join('; ')})` : ''}. ` +
        `${sim.covered.length} would be covered by backups${sim.inheritorIds.length ? ` (${names(members, sim.inheritorIds)})` : ''}.${strain.length ? ` ${strain.join('; ')}.` : ''}`,
      [m.memberId, ...sim.inheritorIds],
      sim.failures.flatMap((f) => f.sources).slice(0, 8),
    )
  }
}

/** Who gives what and who takes whom, never what or why. */
function addHealthFacts(add: Add, members: FamilyMember[], now: Date) {
  for (const med of members.flatMap((m) => m.medications)) {
    const giver = med.ownerId ?? med.memberId
    const backups = backupsOf(giver, med.backupIds)
    const patient = nameOf(members, med.memberId)
    const cover = backups.length ? `; ${names(members, backups)} can step in` : '; no one else is set up to give it'
    add(
      'health',
      giver === med.memberId
        ? `${patient} manages one medication schedule on their own${backups.length ? `; ${names(members, backups)} can step in` : ''}.`
        : `${nameOf(members, giver)} gives one of ${patient}'s medication schedules${cover}.`,
      [med.memberId, giver, ...backups],
      [{ type: 'medication', id: med.id }],
    )
  }

  for (const a of upcomingAppointments(members, now)) {
    const owner = a.ownerId ?? a.who
    const backups = backupsOf(owner, a.backupIds)
    const goes = owner === a.who ? `${nameOf(members, a.who)} goes on their own` : `${nameOf(members, owner)} takes them`
    add(
      'health',
      `Medical appointment for ${nameOf(members, a.who)} ${atTime(a.date, now)}: ${goes}${backups.length ? `, backup ${names(members, backups)}` : ''}.`,
      [a.who, owner, ...backups],
      [{ type: 'event', id: a.id }],
    )
  }

  add('health', 'Conditions, medication names, doses and lab results are never shared with this chat. They are on the Health page and on each person\'s health page.')
}

/** What each part of the app does, for "how do I…" questions. */
const APP_FACTS = [
  "Briefing page: today's greeting and top priority with a Why? button, who carries the house this week, the handoff inbox where requests are accepted or declined, pinned features, Time given back and Time together.",
  `Load page: everyone's load score against the burnout line of ${BURNOUT_THRESHOLD}/100, and Resilience Mode: choose someone and a number of days to see what breaks while they are away, then draft a handover plan that sends requests for consent.`,
  'Operations page: tabs Calendar (agenda and clashes), Meals (a week of meals that fits every diet), Drop anything (drop a PDF, a text file or pasted text and Bayt reads out dates and tasks for review; nothing is saved until you press Save) and School (health briefs and email drafts to copy).',
  "Health page: everyone's status, upcoming appointments, medications with who gives them and their backup, and family patterns; each person's page shows labs and risk flags.",
  'Settings: edit or add people, and the Privacy Vault switch that keeps health analysis on a local model.',
  "The top bar: Viewing as switches whose view of the app you see; the New menu adds an event, drops a document, runs a stress test or opens this week's meals. Pins add features to the Briefing, one set per person.",
  "Bayt never sends messages, books or pays anything, and never moves a task without the person's consent: handoff requests wait in the inbox until accepted.",
]
