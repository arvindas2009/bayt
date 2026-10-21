import { NextResponse } from 'next/server'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { getFamilyWithEverything, getMemories } from '@/lib/db/queries'
import prisma from '@/lib/db/prisma'
import { isDemoMode } from '@/lib/demo/mode'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { buildPriorityItems } from '@/lib/briefing/rank'
import { toTodayPriority } from '@/lib/briefing/compose'
import { computeLoad } from '@/lib/load/model'
import { getToday } from '@/lib/time/today'
import { getDayOfYear, isSameDay } from 'date-fns'
import type { BriefingData } from '@/types/agents'
import type { Family } from '@/types/family'

/**
 * A memory captured today is shown today; otherwise the vault rotates by day. Read live so a
 * memory someone just added appears without regenerating the briefing. Quotes are only ever
 * stored text, never model output.
 */
async function pickMemoryOfTheDay(
  family: Family,
  now: Date,
  stored: BriefingData['memoryOfTheDay'],
): Promise<BriefingData['memoryOfTheDay']> {
  const memories = await getMemories(family.id)
  if (memories.length === 0) return stored
  const todays = memories.find((m) => m.source === 'captured' && isSameDay(new Date(m.capturedAt), now))
  const pick = todays ?? memories[getDayOfYear(now) % memories.length]
  return {
    quote: pick.quote,
    attribution: family.members.find((m) => m.id === pick.attribution)?.name ?? pick.role,
    dateCaptured: pick.capturedAt,
  }
}

/**
 * The stored briefing carries the wording generated at compose time; everything that depends on
 * the current state of the family (load, priority, invisible hours) is recomputed live so it never
 * disagrees with what a handoff just changed.
 */
export async function GET() {
  try {
    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json(null)

    const now = getToday()
    let row = await prisma.briefing.findFirst({ where: { familyId: family.id }, orderBy: { date: 'desc' } })

    // Demo mode composes a briefing without any model, so the first visit is never empty.
    if (isDemoMode && (!row || !isSameDay(row.date, now))) {
      await runOrchestrator(family.id, { offline: true })
      row = await prisma.briefing.findFirst({ where: { familyId: family.id }, orderBy: { date: 'desc' } })
    }
    if (!row) return NextResponse.json(null)

    const fresh = (await getFamilyWithEverything(family.id)) ?? family
    const load = computeLoad(fresh, now)
    const items = buildPriorityItems(fresh, now, load)
    const stored = JSON.parse(row.opsOutput) as Partial<BriefingData>

    const body: BriefingData = {
      date: row.date.toISOString(),
      summary: row.summary,
      insights: stored.insights ?? [],
      timeSavedHours: row.timeSaved,
      dailyBreakdown: stored.dailyBreakdown ?? [],
      dividendLines: stored.dividendLines ?? [],
      memoryOfTheDay: await pickMemoryOfTheDay(fresh, now, stored.memoryOfTheDay),
      alerts: JSON.parse(row.alerts),
      priority: items[0] ? toTodayPriority(items[0]) : null,
      load: {
        totalHours: load.totalHours,
        windowStart: load.windowStart,
        members: load.members.map((m) => ({
          memberId: m.memberId,
          hours: m.hours,
          score: m.score,
          shareOfLoad: m.shareOfLoad,
          daysWithoutRest: m.daysWithoutRest,
        })),
      },
      source: row.isFallback ? 'rules' : 'llm',
    }
    return NextResponse.json(body)
  } catch (error) {
    console.error('[GET /api/briefing]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Briefing failed' }, { status: 500 })
  }
}
