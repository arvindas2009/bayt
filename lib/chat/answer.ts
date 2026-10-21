import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { isFaithfulAnswer } from '@/lib/ai/guards'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { buildFactSheet, isSensitive, type DividendFacts, type Fact, type FactSheet, type FactTopic } from './facts'
import type { Family, FamilyMember } from '@/types/family'
import type { SourceRef } from '@/types/agents'

/**
 * "Ask Bayt": code decides, the model writes. The model reads the fact sheet and answers in a
 * few sentences, naming the facts it used. The answer is shown only if every figure in it is on
 * the sheet; otherwise (and in demo mode, or when no model answers) the matching facts are shown
 * verbatim, labelled as such.
 */

export const CHAT_PAGES = [
  '/briefing', '/load', '/load#resilience', '/operations?tab=calendar', '/operations?tab=school',
  '/operations?tab=meals', '/health', '/settings',
] as const
export type ChatPage = (typeof CHAT_PAGES)[number]

/**
 * ai: written by the model and checked. demo: demo mode, facts only. unavailable: no model answered.
 * unchecked: the model's answer did not match the facts. private: the question named a health detail,
 * so it was not sent to a model.
 */
export type ChatMode = 'ai' | 'demo' | 'unavailable' | 'unchecked' | 'private'

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface ChatAnswer {
  text: string
  sources: SourceRef[]
  page: ChatPage | null
  mode: ChatMode
}

const MAX_HISTORY = 8
const MAX_MATCHES = 3

const AnswerSchema = z.object({
  answer: z.string().max(700).describe('The answer for the person asking, in 1 to 4 short sentences. No fact ids in it.'),
  factIds: z.array(z.string()).describe('Ids of the facts the answer uses, such as F3.'),
  page: z.enum(CHAT_PAGES).nullable().describe('The page where the person can see or act on this, or null.'),
})

// ── No-model path: pick the facts that match the question ───────────────────────────

const TOPIC_WORDS: Record<Exclude<FactTopic, 'viewer'>, RegExp> = {
  load: /\b(load|busy|busiest|most|carr(y|ies|ying)|burn(out|ed|t)?|tired|exhausted|hours?|score|share|rest|overload\w*|work)\b/i,
  priority: /\b(priorit\w*|urgent|important|first|focus|top|need|needs|should)\b/i,
  conflict: /\b(conflicts?|clash\w*|overlap\w*|double|both|same time)\b/i,
  calendar: /\b(today|tonight|tomorrow|week|weekend|calendar|schedule|events?|plans?|when|pick-?up|drop-?off|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  obligation: /\b(due|deadlines?|renew\w*|pay|bills?|fees?|expir\w*|paperwork|visa|emirates id|tasks?|forms?|insurance)\b/i,
  handoff: /\b(handoffs?|requests?|asked|ask|consent|accept\w*|declin\w*|inbox|take over|hand over)\b/i,
  resilience: /\b(away|absent|sick|ill|travel\w*|trip|backups?|fragile|single|cover\w*|bus factor|what if|without|nobody|no one)\b/i,
  health: /\b(medications?|medicines?|meds|dose|doses|pills?|appointments?|doctor|clinic|hospital|health|checkup)\b/i,
  time: /\b(time (given )?back|saved|dividend|time saved)\b/i,
  app: /\b(how|where|page|pin\w*|settings?|vault|privacy|viewing as|app|bayt|feature\w*|use|stress test|resilience mode|drop|upload)\b/i,
}

/** Topics named by unambiguous words ("due", "clash") outrank broad ones ("week", "how"). */
const TOPIC_WEIGHT: Partial<Record<FactTopic, number>> = { obligation: 3, conflict: 3, handoff: 3, health: 3, time: 3 }

const TOPIC_PAGE: Partial<Record<FactTopic, ChatPage>> = {
  load: '/load',
  resilience: '/load#resilience',
  calendar: '/operations?tab=calendar',
  conflict: '/operations?tab=calendar',
  health: '/health',
}

const SELF = /\b(i|me|my|mine|myself)\b/i
/** "What if someone is away": the stress-test facts (they start with "If …") answer it best. */
const ABSENCE = /\b(what if|away|absent|sick|ill|travel\w*|without)\b/i

/**
 * Scores each fact against the question: a person named in both counts most, then a matching
 * topic. Ties keep the sheet's order, which already puts the most important facts first.
 */
export function matchFacts(question: string, sheet: Pick<FactSheet, 'facts' | 'viewer'>, members: FamilyMember[], topics?: FactTopic[]): Fact[] {
  const q = question.toLowerCase()
  const named = new Set(members.filter((m) => new RegExp(`\\b${m.name.toLowerCase()}\\b`).test(q)).map((m) => m.id))
  if (SELF.test(q)) named.add(sheet.viewer.id)
  const wanted = (Object.entries(TOPIC_WORDS) as [FactTopic, RegExp][]).filter(([, re]) => re.test(q)).map(([t]) => t)
  const absence = ABSENCE.test(q)
  const day = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/)?.[1]

  return sheet.facts
    .filter((f) => f.topic !== 'viewer' && (!topics || topics.includes(f.topic)))
    .map((f, order) => {
      let score = 0
      const people = f.memberIds.filter((id) => named.has(id)).length
      if (named.size > 0) score += people > 0 ? 3 + people : -2
      // The person a fact is mainly about comes first ("if Salem were away" over "Salem would cover").
      if (named.has(f.memberIds[0])) score += 2
      if (wanted.includes(f.topic)) score += TOPIC_WEIGHT[f.topic] ?? 2
      if (day && f.text.toLowerCase().includes(day)) score += 2
      if (absence && f.text.startsWith('If ') && (named.size === 0 || named.has(f.memberIds[0]))) score += 2
      return { f, score, order }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_MATCHES)
    .map((x) => x.f)
}

const NOTHING_FOUND =
  "I could not find that in today's data. Try asking who carries the most this week, what is due soon, what is on the calendar, or what happens if someone is away."

function factsAnswer(question: string, sheet: FactSheet, members: FamilyMember[], mode: ChatMode, topics?: FactTopic[]): ChatAnswer {
  const matched = matchFacts(question, sheet, members, topics)
  if (matched.length === 0) return { text: NOTHING_FOUND, sources: [], page: null, mode }
  return {
    text: matched.map((f) => f.text).join('\n'),
    sources: sourcesOf(matched),
    page: TOPIC_PAGE[matched[0].topic] ?? null,
    mode,
  }
}

function sourcesOf(facts: Fact[]): SourceRef[] {
  const seen = new Map<string, SourceRef>()
  for (const s of facts.flatMap((f) => f.sources)) seen.set(`${s.type}:${s.id}`, s)
  return [...seen.values()].slice(0, 12)
}

// ── Model path ─────────────────────────────────────────────────────────────────────

/** The model sometimes cites inline ("[F3]", "(F1, F4)", "fact ids F1–F3") despite being asked not to. */
export const stripFactIds = (text: string) =>
  text
    .replace(/[,;]?\s*[[(]?(?:see\s+)?(?:facts?(?:\s+ids?)?\s+)?\bF\d+\b(?:\s*(?:[-–—,&]|and)\s*F\d+\b)*[\])]?/gi, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()

export async function answerQuestion(input: {
  family: Family
  now: Date
  viewerId: string
  question: string
  history: ChatTurn[]
  dividend?: DividendFacts | null
  offline: boolean
}): Promise<ChatAnswer> {
  const { family, now, viewerId, question, offline } = input
  const sheet = buildFactSheet(family, now, viewerId, input.dividend)
  const members = family.members

  if (offline) return factsAnswer(question, sheet, members, 'demo')

  // A question that names a condition or a medication stays here: it answers from who-gives-what.
  if (isSensitive(question, sheet.sensitive)) {
    const answer = factsAnswer(question, sheet, members, 'private', ['health'])
    return { ...answer, page: '/health' }
  }

  // Earlier turns that named a health detail are not sent either.
  const history = input.history.filter((t) => !isSensitive(t.text, sheet.sensitive)).slice(-MAX_HISTORY)
  const transcript = history.map((t) => `${t.role === 'user' ? sheet.viewer.name : 'Bayt'}: ${t.text}`).join('\n')

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: AnswerSchema,
    timeoutMs: 25_000,
    fallbackTimeoutMs: 40_000,
    system: `You are Bayt, the assistant inside a family app for the ${family.name} household, talking with ${sheet.viewer.name}. Answer using ONLY the numbered facts.
Rules:
- Use only names, numbers, dates and times that appear in the facts. Copy figures exactly; never calculate new ones (no totals, differences, ratios, or words like "twice").
- If the facts do not answer the question, say so briefly and suggest the page where they can look.
- Never mention medical conditions, diagnoses, medication names or doses. For health details, point to the Health page.
- Bayt only explains. It never sends, books, pays or reassigns anything; a handoff needs the other person's consent in the inbox.
- Never use gendered pronouns (he, she, his, her). Use names or "they".
- Do not write fact ids in the answer; list the ids you used in factIds.
- Be warm, plain and short: one to four sentences, speaking to ${sheet.viewer.name} directly.

Facts:
${sheet.text}`,
    prompt: `${transcript ? `Conversation so far:\n${transcript}\n\n` : ''}Question from ${sheet.viewer.name}: ${question}`,
  })

  if (!result.ok) {
    console.warn(`[chat] No model answered: ${result.error}`)
    return factsAnswer(question, sheet, members, 'unavailable')
  }

  const text = stripFactIds(result.data.answer)
  const allowed = [sheet.text, question, ...history.filter((t) => t.role === 'user').map((t) => t.text)].join('\n')
  if (!text || !isFaithfulAnswer(text, allowed) || isSensitive(text, sheet.sensitive)) {
    console.warn('[chat] Answer dropped: it did not match the fact sheet', { answer: result.data.answer })
    return factsAnswer(question, sheet, members, 'unchecked')
  }

  const cited = sheet.facts.filter((f) => result.data.factIds.includes(f.id))
  return { text, sources: sourcesOf(cited), page: result.data.page ?? null, mode: 'ai' }
}
