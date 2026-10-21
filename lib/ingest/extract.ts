import { differenceInCalendarDays, format, isValid, parse, startOfDay } from 'date-fns'
import { geminiFlash } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { getToday } from '@/lib/time/today'
import { REFERENCE_DURATIONS } from '@/lib/load/reference-durations'
import type { Family } from '@/types/family'
import {
  EVENT_CATEGORIES,
  ExtractionSchema,
  OBLIGATION_CATEGORIES,
  type Candidate,
  type ExtractionResult,
  type IngestInput,
} from './types'

/**
 * Read a document and propose what it asks of the family.
 *
 * Code decides what is acceptable: a date must be real and near, an owner must be a real member,
 * a category and task type must be ones we know, and for text we can search, the quoted words must
 * actually be in the text. The model only reads and proposes. A person confirms before anything is saved.
 */

const MAX_TEXT_CHARS = 20_000
const MAX_CANDIDATES = 8

const norm = (s: string) => s.toLowerCase().replace(/[\s ]+/g, ' ').replace(/["'“”‘’]/g, '').trim()

function validDate(iso: string, today: Date): boolean {
  const d = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) return false
  const days = differenceInCalendarDays(d, startOfDay(today))
  // A circular about last year or a decade from now is a misread, not a task.
  return days >= -30 && days <= 800
}

/** Task types a document can sensibly ask for: not meal plans, school runs or doses. */
const DOCUMENT_TASK_TYPES = new Set([
  'appointment_escort', 'refill', 'lab_visit', 'school_meeting', 'school_form', 'fee_payment',
  'renewal', 'bill', 'paperwork', 'errand', 'generic',
])

function pickCategory(kind: 'obligation' | 'event', raw: string, guessed?: string): string {
  const list: readonly string[] = kind === 'obligation' ? OBLIGATION_CATEGORIES : EVENT_CATEGORIES
  const find = (name: string) => list.find((c) => c.toLowerCase() === name.trim().toLowerCase())
  return find(raw) ?? (guessed ? find(guessed) : undefined) ?? (kind === 'obligation' ? 'Home' : 'family')
}

// ─── Without a model: read the dates a text states ───────────────────────────────

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\.?(?:,?\\s+(\\d{4}))?\\b`, 'i')
const MONTH_DAY = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
const NUMERIC = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/
const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/
const TIME = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\s?(am|pm)?\b/i

const MONTH_INDEX = (name: string) => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(name.slice(0, 3).toLowerCase())

/** The next time this day and month come round (or the stated year). */
function resolveDate(day: number, month: number, year: number | null, today: Date): string | null {
  const base = startOfDay(today)
  let y = year ?? base.getFullYear()
  let d = new Date(y, month, day)
  if (d.getMonth() !== month) return null
  if (year === null && differenceInCalendarDays(d, base) < -30) {
    y += 1
    d = new Date(y, month, day)
  }
  return isValid(d) ? format(d, 'yyyy-MM-dd') : null
}

export function findDate(line: string, today: Date): string | null {
  const iso = ISO.exec(line)
  if (iso) return resolveDate(Number(iso[3]), Number(iso[2]) - 1, Number(iso[1]), today)
  const num = NUMERIC.exec(line)
  if (num) return resolveDate(Number(num[1]), Number(num[2]) - 1, Number(num[3]), today)
  const dm = DAY_MONTH.exec(line)
  if (dm) return resolveDate(Number(dm[1]), MONTH_INDEX(dm[2]), dm[3] ? Number(dm[3]) : null, today)
  const md = MONTH_DAY.exec(line)
  if (md) return resolveDate(Number(md[2]), MONTH_INDEX(md[1]), md[3] ? Number(md[3]) : null, today)
  return null
}

function findTime(line: string): string | null {
  const m = TIME.exec(line)
  if (!m) return null
  let h = Number(m[1])
  if (m[3]?.toLowerCase() === 'pm' && h < 12) h += 12
  if (m[3]?.toLowerCase() === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

function guessTaskType(line: string): { taskType: string; category: string; kind: 'obligation' | 'event' } {
  const t = line.toLowerCase()
  if (/\b(fee|fees|invoice|payment|pay)\b/.test(t)) return { taskType: 'fee_payment', category: 'School', kind: 'obligation' }
  if (/\b(renew|renewal|expires?|expiry|visa|emirates id|passport)\b/.test(t)) return { taskType: 'renewal', category: 'Residency', kind: 'obligation' }
  if (/\b(form|consent|permission slip|return)\b/.test(t)) return { taskType: 'school_form', category: 'School', kind: 'obligation' }
  if (/\b(bill|dewa|etisalat|du\b)\b/.test(t)) return { taskType: 'bill', category: 'Finance', kind: 'obligation' }
  if (/\b(meeting|conference|assembly|open day|trip|concert|match|sports day|appointment)\b/.test(t)) {
    return { taskType: /appointment/.test(t) ? 'appointment_escort' : 'school_meeting', category: /appointment/.test(t) ? 'medical' : 'education', kind: 'event' }
  }
  return { taskType: 'paperwork', category: 'Home', kind: 'obligation' }
}

function readDates(text: string, today: Date): Candidate[] {
  const out: Candidate[] = []
  const lines = text.split(/\r?\n|(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (out.length >= MAX_CANDIDATES) break
    const date = findDate(line, today)
    if (!date || !validDate(date, today)) continue
    const guess = guessTaskType(line)
    const stripped = line.replace(/^[-*•\d.)\s]+/, '').replace(/^dear [^,]{1,40},\s*/i, '')
    const cleaned = stripped.charAt(0).toUpperCase() + stripped.slice(1)
    out.push({
      key: `d${out.length + 1}`,
      kind: guess.kind,
      title: cleaned.length > 90 ? `${cleaned.slice(0, 87).trimEnd()}…` : cleaned,
      date,
      time: guess.kind === 'event' ? findTime(line) : null,
      category: pickCategory(guess.kind, guess.category),
      taskType: guess.taskType in REFERENCE_DURATIONS ? guess.taskType : 'generic',
      suggestedOwnerId: null,
      consequence: '',
      quote: cleaned.slice(0, 200),
      verified: true,
    })
  }
  return out
}

// ─── With a model ────────────────────────────────────────────────────────────────

const SYSTEM = `You read one document for a family in the UAE (a school circular, a letter, a bill, an appointment card) and list what it asks the family to do or attend.
Rules:
- Only list things the document actually states, each with a date. Skip anything without a date.
- Never invent a date, amount, place or consequence. Copy dates exactly as written; resolve "next Tuesday" only if today's date lets you do it with certainty, otherwise skip it.
- "quote" must be words copied from the document.
- ownerAlias is only for a person the document names or addresses; otherwise null.
- consequence is only what the document says happens if it is missed; otherwise an empty string.
- Return an empty list if the document asks nothing of the family.`

interface Options {
  /** No model calls at all (demo mode): only the date reader runs, and only on text. */
  offline?: boolean
}

export async function extractCandidates(
  family: Family,
  input: IngestInput,
  options: Options = {},
): Promise<ExtractionResult & { error?: string }> {
  const today = getToday()
  const searchable = input.kind === 'text' ? input.text.slice(0, MAX_TEXT_CHARS) : null
  const notes: string[] = []

  const aliasToId = new Map<string, string>()
  const roster = family.members
    .map((m, i) => {
      aliasToId.set(`m${i + 1}`, m.id)
      return `m${i + 1}: ${m.name} (${m.role}, age ${m.age})`
    })
    .join('\n')

  const dateOnly = (reason: string): ExtractionResult & { error?: string } => {
    if (!searchable) return { candidates: [], method: 'dates', notes, error: reason }
    const candidates = readDates(searchable, today)
    notes.push(
      candidates.length > 0
        ? 'These were found by reading the dates in the text. Check the owner and what it is.'
        : 'No dates were found in the text.',
    )
    return { candidates, method: 'dates', notes, error: options.offline ? undefined : reason }
  }

  if (options.offline) {
    if (!searchable) {
      return { candidates: [], method: 'dates', notes, error: 'Demo mode reads pasted text only. Paste the text of the document.' }
    }
    return dateOnly('')
  }

  const header = `Today is ${format(today, 'EEEE d MMMM yyyy')}.\nFamily members (use these aliases only):\n${roster}\n\nDocument: ${input.label}`
  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: ExtractionSchema,
    system: SYSTEM,
    timeoutMs: 40_000,
    // A file can only be read by a model that accepts files, so never hand it to the text-only fallback.
    failover: input.kind === 'text',
    messages: [
      {
        role: 'user',
        content:
          input.kind === 'text'
            ? [{ type: 'text', text: `${header}\n\n---\n${searchable}` }]
            : [
                { type: 'text', text: header },
                input.mediaType.startsWith('image/')
                  ? { type: 'image', image: input.data, mediaType: input.mediaType }
                  : { type: 'file', data: input.data, mediaType: input.mediaType },
              ],
      },
    ],
  })

  if (!result.ok) return dateOnly(result.error)

  const haystack = searchable ? norm(searchable) : null
  const seen = new Set<string>()
  const candidates: Candidate[] = []
  let dropped = 0

  for (const item of result.data.items) {
    if (candidates.length >= MAX_CANDIDATES) break
    const title = item.title.trim()
    const quote = item.quote.trim()
    // Weaker models drift from the requested format ("Saturday 5 December 2026"), so the date is read
    // by code: from the quoted words first (they are checked against the text), then from the field.
    const stated = item.date.trim()
    const date = findDate(quote, today) ?? (/^\d{4}-\d{2}-\d{2}$/.test(stated) ? stated : findDate(stated, today)) ?? ''
    const dupKey = `${norm(title)}|${date}`
    if (!title || !validDate(date, today) || seen.has(dupKey)) {
      dropped++
      continue
    }
    // For text we can search, the quoted words must really be in it: no quote, no item.
    if (haystack && (quote.length < 6 || !haystack.includes(norm(quote)))) {
      dropped++
      continue
    }
    seen.add(dupKey)
    // How much work it is decides the load, so the model's choice is only kept when it is a task a
    // document can ask for. Anything else (a meal plan for a meeting) falls back to a keyword guess.
    const guess = guessTaskType(`${title} ${quote}`)
    const time = findTime(item.time ?? '') ?? findTime(quote)
    // A fee, a form or a renewal is a task even when a model files it as an event. Only a clock time
    // or an event-like word makes something an event.
    const kind = item.kind === 'event' && !time && guess.kind === 'obligation' && guess.taskType !== 'paperwork' ? 'obligation' : item.kind
    const modelType = DOCUMENT_TASK_TYPES.has(item.taskType) && item.taskType !== 'generic' ? item.taskType : 'paperwork'
    const taskType = guess.taskType !== 'paperwork' ? guess.taskType : modelType
    candidates.push({
      key: `c${candidates.length + 1}`,
      kind,
      title,
      date,
      time: kind === 'event' ? time : null,
      category: pickCategory(kind, item.category, guess.category),
      taskType,
      suggestedOwnerId: (item.ownerAlias && aliasToId.get(item.ownerAlias.trim().toLowerCase())) || null,
      consequence: item.consequence.trim(),
      quote,
      verified: Boolean(haystack),
    })
  }

  if (dropped > 0) notes.push(`${dropped} possible ${dropped === 1 ? 'item was' : 'items were'} left out because the date or the quoted words did not check out.`)
  if (!searchable && candidates.length > 0) notes.push('This file was read by a model. Check each item against the original before you save it.')
  return { candidates, method: 'model', notes }
}
