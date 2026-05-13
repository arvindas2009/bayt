import { z } from 'zod'
import { geminiFlash } from '@/lib/ai/client'
import { safeGenerateObject } from '@/lib/ai/safe-generate'
import type { Family, FamilyMember } from '@/types'
import type { BriefingData, MemberBriefing } from '@/types/agents'

// ─── Schema ───────────────────────────────────────────────────────────────────

const MemberBriefingSchema = z.object({
  greeting: z.string().max(80),
  insights: z
    .array(
      z.object({
        text: z.string(),
        priority: z.number().min(1).max(5),
        agent: z.enum(['operations', 'health', 'connection', 'caregiver']),
      }),
    )
    .max(4),
  oneAction: z.string().describe('Single most important thing this member should do today'),
  healthNudge: z
    .string()
    .optional()
    .describe('Personal health note, non-alarming tone'),
  tone: z.enum(['authoritative', 'supportive', 'friendly', 'simple']),
})

// ─── System prompts per member ────────────────────────────────────────────────

function buildSystemPrompt(member: FamilyMember): string {
  if (member.role === 'parent' && member.name === 'Salem') {
    return `You are briefing Salem, the family patriarch and primary decision-maker. Use an authoritative, direct tone. Emphasize logistics, health decisions (especially his diabetes management and HbA1c), and caregiver load distribution. Lead with operational priorities. Be concise — he is busy. Max 4 insights. The tone field must be "authoritative".`
  }

  if (member.role === 'parent' && member.name === 'Fatima') {
    return `You are briefing Fatima, the family's primary organizer and caregiver. Use a warm, supportive tone that acknowledges the invisible work she carries. Lead with her caregiver load and burnout risk. Highlight any protective time blocks in her day. Surface invisible hours clearly. Max 4 insights. The tone field must be "supportive".`
  }

  if (member.name === 'Layla') {
    return `You are briefing Layla, a teenager. Use a friendly, peer-like tone. Focus only on her schedule and immediate concerns — exams, activities, social calendar. Do not mention alarming health data; if there is a health nudge keep it positive and encouraging, never alarming. Max 3 insights. The tone field must be "friendly".`
  }

  if (member.name === 'Khalid') {
    return `You are briefing Khalid, a young child. Use the simplest possible language — short sentences, encouraging words. Only mention his day: school, activities, any fun plans. Limit to 2 insights maximum. End with one encouraging line in the oneAction field. The tone field must be "simple".`
  }

  if (member.role === 'grandparent') {
    return `You are briefing ${member.name}, the family grandmother. Use simple, clear, warm language. Lead with medication reminders as priority 1. Include one meaningful family connection note among the insights. Keep everything positive and reassuring. Max 3 insights. The tone field must be "simple".`
  }

  return `You are briefing ${member.name}, a member of the Al-Salem family. Use a supportive, friendly tone. Provide the most relevant insights about their day. Max 4 insights.`
}

// ─── Prompt context ───────────────────────────────────────────────────────────

function buildUserPrompt(member: FamilyMember, baseBriefing: BriefingData, family: Family): string {
  const today = new Date().toDateString()
  const todayEvents = member.calendarEvents
    .filter((e) => new Date(e.date).toDateString() === today)
    .map((e) => e.title)

  const medications = member.medications.map(
    (m) => `${m.name} ${m.dosage} (${m.frequency})`,
  )

  const memberInsights = baseBriefing.insights
    .filter((i) => i.text.toLowerCase().includes(member.name.toLowerCase()))
    .map((i) => `[${i.agent}/${i.severity}] ${i.text}`)

  const memberAlerts = baseBriefing.alerts
    .filter((a) => a.memberName === member.name || a.memberId === member.id)
    .map((a) => `[${a.severity}] ${a.text}`)

  const otherMembersNames = family.members
    .filter((m) => m.id !== member.id)
    .map((m) => m.name)
    .join(', ')

  return [
    `Family: ${family.name}`,
    `Member: ${member.name}, age ${member.age}, role: ${member.role}`,
    member.healthProfile?.conditions.length
      ? `Health conditions: ${member.healthProfile.conditions.join(', ')}`
      : '',
    medications.length ? `Medications: ${medications.join('; ')}` : '',
    todayEvents.length
      ? `Today's calendar: ${todayEvents.join(', ')}`
      : "No events on today's calendar",
    `Other family members: ${otherMembersNames}`,
    '',
    `Today's family briefing summary: ${baseBriefing.summary}`,
    '',
    memberInsights.length
      ? `Insights directly relevant to ${member.name}:\n${memberInsights.join('\n')}`
      : `No specific insights flagged for ${member.name} in today's family briefing.`,
    memberAlerts.length
      ? `Active alerts for ${member.name}:\n${memberAlerts.join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function buildFallback(member: FamilyMember, baseBriefing: BriefingData): MemberBriefing {
  const tone: MemberBriefing['tone'] =
    member.role === 'grandparent'
      ? 'simple'
      : member.name === 'Salem'
        ? 'authoritative'
        : member.name === 'Fatima'
          ? 'supportive'
          : member.role === 'child'
            ? member.age < 13
              ? 'simple'
              : 'friendly'
            : 'friendly'

  return {
    memberId: member.id,
    date: new Date().toISOString(),
    greeting: `Good morning, ${member.name}.`,
    insights: baseBriefing.insights.slice(0, 2).map((i, idx) => ({
      text: i.text,
      priority: idx + 1,
      agent: i.agent,
    })),
    oneAction: "Review your schedule and check in with the family.",
    tone,
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateMemberBriefing(
  member: FamilyMember,
  baseBriefing: BriefingData,
  family: Family,
): Promise<MemberBriefing> {
  const result = await safeGenerateObject({
    model: geminiFlash,
    schema: MemberBriefingSchema,
    system: buildSystemPrompt(member),
    prompt: buildUserPrompt(member, baseBriefing, family),
  })

  if (!result.ok) {
    console.warn(`[adaptive-briefing] Generation failed for ${member.name}: ${result.error}`)
    return buildFallback(member, baseBriefing)
  }

  const data = result.data as z.infer<typeof MemberBriefingSchema>
  return {
    memberId: member.id,
    date: new Date().toISOString(),
    greeting: data.greeting,
    insights: data.insights,
    oneAction: data.oneAction,
    healthNudge: data.healthNudge,
    tone: data.tone,
  }
}
