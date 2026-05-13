import { NextRequest, NextResponse } from 'next/server'
import { getFamilyMember, getFamilyWithEverything } from '@/lib/db/queries'
import { generateMemberBriefing } from '@/lib/agents/adaptive-briefing'
import { isDemoMode, demoBriefing } from '@/lib/demo/mode'
import prisma from '@/lib/db/prisma'
import { calculateInvisibleHours } from '@/lib/utils/invisible-hours'
import type { BriefingData, MemberBriefing } from '@/types/agents'

// ─── In-memory cache (memberId:YYYY-MM-DD → MemberBriefing) ──────────────────
const cache = new Map<string, MemberBriefing>()

function todayKey(memberId: string): string {
  return `${memberId}:${new Date().toISOString().slice(0, 10)}`
}

// ─── Demo briefings ───────────────────────────────────────────────────────────

const DEMO_BRIEFINGS: Record<string, MemberBriefing> = {
  Salem: {
    memberId: 'mem_salem',
    date: new Date().toISOString(),
    greeting: 'Good morning, Salem.',
    insights: [
      {
        text: "Your Regional Contractor Visit at 2 PM overlaps Khalid's parent-teacher conference. Fatima can cover the school — her design call ends at noon.",
        priority: 1,
        agent: 'operations',
      },
      {
        text: 'Your HbA1c is holding steady at 6.8%. Evening Metformin was missed twice this week.',
        priority: 2,
        agent: 'health',
      },
      {
        text: "Fatima is carrying 72% of caregiving duties. Consider taking the May 11 clinic run to redistribute the load.",
        priority: 3,
        agent: 'caregiver',
      },
      {
        text: "Aisha's physiotherapy is tomorrow at 10 AM — transport needs to be arranged.",
        priority: 4,
        agent: 'operations',
      },
    ],
    oneAction: "Confirm who is driving Aisha to physiotherapy tomorrow at 10 AM.",
    healthNudge: 'Evening Metformin reminder has been set for 8 PM.',
    tone: 'authoritative',
  },
  Fatima: {
    memberId: 'mem_fatima',
    date: new Date().toISOString(),
    greeting: 'Good morning, Fatima.',
    insights: [
      {
        text: 'You are absorbing 72% of caregiving duties this week. Burnout risk: 78/100. Your 2 PM design call is protected — no conflicts detected.',
        priority: 1,
        agent: 'caregiver',
      },
      {
        text: "Your dentist and Aisha's physiotherapy both land at 10 AM on May 9. Salem can cover one — ask him tonight.",
        priority: 2,
        agent: 'operations',
      },
      {
        text: "Your Vitamin D is at 19 ng/mL — below optimal. A 20-minute walk this weekend would help.",
        priority: 3,
        agent: 'health',
      },
      {
        text: "Khalid's parent-teacher meeting is at 1 PM today. You are free after noon.",
        priority: 4,
        agent: 'operations',
      },
    ],
    oneAction: "Ask Salem to handle the May 9 appointment conflict so you can attend your dentist.",
    healthNudge: 'Your Vitamin D is below threshold — try to get some sunlight today.',
    tone: 'supportive',
  },
  Layla: {
    memberId: 'mem_layla',
    date: new Date().toISOString(),
    greeting: 'Morning, Layla!',
    insights: [
      {
        text: 'IB Physics exam is May 12. Your evenings are clear for the next 3 days — no conflicts.',
        priority: 1,
        agent: 'operations',
      },
      {
        text: 'Your schedule today is light. Good day to get ahead on revision.',
        priority: 2,
        agent: 'operations',
      },
      {
        text: "The family has Khalid's school meeting handled — nothing for you to worry about.",
        priority: 3,
        agent: 'connection',
      },
    ],
    oneAction: 'Review Chapter 6 of Physics notes this evening.',
    healthNudge: 'A short walk before studying can improve focus.',
    tone: 'friendly',
  },
  Khalid: {
    memberId: 'mem_khalid',
    date: new Date().toISOString(),
    greeting: 'Good morning, Khalid!',
    insights: [
      {
        text: 'Mama or Baba will come to your teacher meeting at school today at 1 PM.',
        priority: 1,
        agent: 'operations',
      },
      {
        text: 'Remember to take your morning medicine after breakfast.',
        priority: 2,
        agent: 'health',
      },
    ],
    oneAction: 'Take your medicine after breakfast and have a great day at school.',
    tone: 'simple',
  },
  Aisha: {
    memberId: 'mem_aisha',
    date: new Date().toISOString(),
    greeting: 'Good morning, Aisha.',
    insights: [
      {
        text: 'Your Alendronate (70mg) is due this morning. Take it with a full glass of water before eating, then wait 30 minutes.',
        priority: 1,
        agent: 'health',
      },
      {
        text: 'Your Lisinopril (10mg) at your usual time today. All medications are stocked and ready.',
        priority: 2,
        agent: 'health',
      },
      {
        text: 'Your physiotherapy appointment is tomorrow at 10 AM. The family will arrange your transport.',
        priority: 3,
        agent: 'operations',
      },
    ],
    oneAction: 'Take your Alendronate first thing this morning, before breakfast.',
    healthNudge: 'All your medications are in good supply this week.',
    tone: 'simple',
  },
}

function getDemoBriefing(memberId: string): MemberBriefing {
  const byId = Object.values(DEMO_BRIEFINGS).find((b) => b.memberId === memberId)
  if (byId) return { ...byId, date: new Date().toISOString() }
  // fallback — unknown member
  return {
    memberId,
    date: new Date().toISOString(),
    greeting: 'Good morning.',
    insights: [],
    oneAction: 'Check your schedule for today.',
    tone: 'friendly',
  }
}

// ─── Reconstruct BriefingData from DB row ─────────────────────────────────────

async function getBaseBriefing(familyId: string, family: Awaited<ReturnType<typeof getFamilyWithEverything>>): Promise<BriefingData> {
  const row = await prisma.briefing.findFirst({
    where: { familyId },
    orderBy: { date: 'desc' },
  })

  const invisibleHours = family ? calculateInvisibleHours(family) : undefined

  if (!row) {
    return { ...demoBriefing, invisibleHours }
  }

  const opsOutput = JSON.parse(row.opsOutput)
  const alerts = JSON.parse(row.alerts)

  return {
    date: row.date.toISOString(),
    summary: row.summary,
    insights: opsOutput.insights ?? [],
    timeSavedHours: row.timeSaved,
    dailyBreakdown: opsOutput.dailyBreakdown ?? [],
    memoryOfTheDay: opsOutput.memoryOfTheDay,
    alerts,
    invisibleHours,
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params

  if (isDemoMode) {
    return NextResponse.json(getDemoBriefing(memberId))
  }

  // Check cache
  const cacheKey = todayKey(memberId)
  const cached = cache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const [member, family] = await Promise.all([
    getFamilyMember(memberId),
    getFamilyWithEverything(),
  ])

  if (!member || !family) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const baseBriefing = await getBaseBriefing(family.id, family)
  const memberBriefing = await generateMemberBriefing(member, baseBriefing, family)

  cache.set(cacheKey, memberBriefing)

  return NextResponse.json(memberBriefing)
}
