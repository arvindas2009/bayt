import { z } from 'zod'
import { format, isSameDay } from 'date-fns'
import { geminiFlash } from '@/lib/ai/client'
import { arabicKeepsFacts, isFaithfulRewrite } from '@/lib/ai/guards'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import { isGenericPriority, priorityFor, type PriorityItem } from '@/lib/briefing/rank'
import { toTodayPriority } from '@/lib/briefing/compose'
import { getToday } from '@/lib/time/today'
import type { LoadReport } from '@/lib/load/model'
import type { Family, FamilyMember } from '@/types'
import type { AgentName, MemberBriefing } from '@/types/agents'

/**
 * Per-member briefing: the same facts, a different voice.
 *
 * What to say is deterministic: the member's ranked items become the candidates and "Today's
 * Priority" is simply their top item. The model only chooses a greeting and rephrases candidates
 * in the member's register. It is never told conditions or medication names; for health it gets
 * "a medication reminder is due", not what the medication is.
 */

type Persona = { tone: MemberBriefing['tone']; voice: string; maxInsights: number }

/** Persona from role, age and computed load: never from a first name. */
function personaFor(member: FamilyMember, load: LoadReport): Persona {
  if (member.role === 'grandparent') {
    return {
      tone: 'simple',
      voice: 'Use simple, clear, warm language and reassure. Put any reminder first. Keep everything positive.',
      maxInsights: 3,
    }
  }
  if (member.role === 'child') {
    return member.age < 13
      ? { tone: 'simple', voice: 'Use very short, encouraging sentences a young child can read. Only talk about their own day.', maxInsights: 2 }
      : { tone: 'friendly', voice: 'Use a friendly, peer-like tone. Focus on their schedule. Never alarming.', maxInsights: 3 }
  }
  const mine = load.members.find((m) => m.memberId === member.id)
  const carriesMost = load.topMemberId === member.id && (mine?.score ?? 0) >= 50
  return carriesMost
    ? {
        tone: 'supportive',
        voice: 'Use a warm, supportive tone that acknowledges the invisible work this person carries. Lead with their load and anything that gives them time back.',
        maxInsights: 4,
      }
    : { tone: 'authoritative', voice: 'Use a direct, concise, logistics-first tone. This person is busy.', maxInsights: 4 }
}

interface Candidate {
  id: string
  text: string
  agent: AgentName
  priority: number
}

function buildCandidates(
  member: FamilyMember,
  family: Family,
  items: PriorityItem[],
  now: Date,
  connectionAction?: { text: string },
): Candidate[] {
  // Handoff requests live in the consent inbox, so they are not repeated as a line of text.
  const candidates: Candidate[] = priorityFor(items, member.id)
    .filter((item) => item.kind !== 'handoff')
    .slice(0, 3)
    .map((item, i) => ({
      id: item.id,
      text: item.action,
      agent: (item.kind === 'handoff' || item.kind === 'burnout' ? 'caregiver' : 'operations') as AgentName,
      priority: i + 1,
    }))

  const today = member.calendarEvents
    .filter((e) => isSameDay(new Date(e.date), now) && new Date(e.date) >= now)
    .slice(0, 2)
  for (const e of today) {
    candidates.push({ id: `event:${e.id}`, text: `Today at ${format(new Date(e.date), 'HH:mm')}: ${e.title}.`, agent: 'operations', priority: 4 })
  }

  // A reminder, not a prescription: the model is never told what the medication is.
  const dosesOwnedBy = family.members.flatMap((m) => m.medications).filter((m) => (m.ownerId ?? m.memberId) === member.id && m.memberId === member.id)
  if (member.role === 'grandparent' && dosesOwnedBy.length > 0) {
    candidates.unshift({ id: 'meds', text: 'Your daily medication reminder is due today.', agent: 'health', priority: 1 })
  }

  if (connectionAction) candidates.push({ id: 'connection', text: connectionAction.text, agent: 'connection', priority: 5 })
  return candidates
}

const BriefingWordingSchema = z.object({
  greeting: z.string().max(80),
  insights: z.array(z.object({ id: z.string(), text: z.string() })),
})

/** The member's top ranked item, or the next thing on their calendar, or an honest "nothing urgent". */
function priorityFrom(member: FamilyMember, items: PriorityItem[], now: Date): { text: string; priority: MemberBriefing['priority'] } {
  const top = priorityFor(items, member.id)[0]
  if (top) return { text: top.action, priority: toTodayPriority(top) }

  const next = member.calendarEvents
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  if (next) {
    const when = isSameDay(new Date(next.date), now) ? `today at ${format(new Date(next.date), 'HH:mm')}` : format(new Date(next.date), "EEEE 'at' HH:mm")
    return {
      text: `Nothing urgent needs you. Next on your calendar: "${next.title}" ${when}.`,
      priority: null,
    }
  }
  return { text: `Nothing needs you today, ${member.name}. Enjoy the time.`, priority: null }
}

export async function generateMemberBriefing(
  member: FamilyMember,
  family: Family,
  context: { load: LoadReport; items: PriorityItem[]; connectionAction?: { text: string } },
  options: { offline?: boolean; now?: Date } = {},
): Promise<MemberBriefing> {
  const now = options.now ?? getToday()
  const persona = personaFor(member, context.load)
  const { text: oneAction, priority } = priorityFrom(member, context.items, now)
  const candidates = buildCandidates(member, family, context.items, now, context.connectionAction).slice(0, persona.maxInsights)

  const base: MemberBriefing = {
    memberId: member.id,
    date: now.toISOString(),
    greeting: `Good morning, ${member.name}.`,
    insights: candidates.map((c) => ({ text: c.text, priority: c.priority, agent: c.agent })),
    oneAction,
    priority,
    tone: persona.tone,
  }

  // Specific by construction, but guard against a generic string ever reaching the top slot.
  if (isGenericPriority(base.oneAction)) base.oneAction = `Nothing urgent needs you today, ${member.name}.`

  if (options.offline || candidates.length === 0) return base

  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: BriefingWordingSchema,
    timeoutMs: 25_000,
    fallbackTimeoutMs: 40_000,
    system: `You are briefing ${member.name} (${member.role}, age ${member.age}) in the ${family.name} family. ${persona.voice}
Only rephrase the items you are given, keeping each one a short statement or instruction. Do NOT add facts or details, do not narrate or imagine scenes, do not describe anything as already happening, and do not change any name, number or time or mention health conditions. Never use gendered pronouns. Return a greeting under 80 characters.`,
    prompt: `Rewrite each item for ${member.name}:\n${candidates.map((c) => `- id ${c.id}: ${c.text}`).join('\n')}`,
  })

  if (!result.ok) {
    console.warn(`[adaptive-briefing] Wording unavailable for ${member.name}: ${result.error}`)
    return base
  }

  const rewritten = new Map(result.data.insights.map((i) => [i.id, i.text.trim()]))

  const wordedBase: MemberBriefing = {
    ...base,
    greeting: result.data.greeting.trim() || base.greeting,
    insights: candidates.map((c) => {
      const text = rewritten.get(c.id)
      return { text: text && isFaithfulRewrite(c.text, text) ? text : c.text, priority: c.priority, agent: c.agent }
    }),
  }

  if (member.role !== 'grandparent') return wordedBase
  return { ...wordedBase, textAr: await arabicReadAloud(wordedBase, member) }
}

const ArabicSchema = z.object({ textAr: z.string().max(600) })

/**
 * Arabic text for the speech synthesiser: the greeting and today's priority, translated, not
 * extended. Dropped (so the button simply hides) if the figures differ from the English source.
 */
async function arabicReadAloud(briefing: MemberBriefing, member: FamilyMember): Promise<string | undefined> {
  const source = `${briefing.greeting} ${briefing.oneAction}`
  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: ArabicSchema,
    timeoutMs: 20_000,
    fallbackTimeoutMs: 30_000,
    system: `Translate the text into simple, warm Modern Standard Arabic for reading aloud to ${member.name}. Translate only what is given: add nothing, drop nothing, and keep every name and number exactly. Never use gendered pronouns for anyone other than the listener. Return only the translation.`,
    prompt: source,
  })
  if (!result.ok) return undefined
  const textAr = result.data.textAr.trim()
  return textAr && arabicKeepsFacts(source, textAr) ? textAr : undefined
}
