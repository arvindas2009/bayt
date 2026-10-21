import { NextResponse } from 'next/server'
import { isSameDay } from 'date-fns'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { getFamilyWithEverything } from '@/lib/db/queries'
import prisma from '@/lib/db/prisma'
import { isDemoMode } from '@/lib/demo/mode'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { getToday } from '@/lib/time/today'

const MAX_AGE_HOURS = 12

export async function POST(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get('force') === 'true'

    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

    if (!force) {
      const existing = await prisma.briefing.findFirst({ where: { familyId: family.id }, orderBy: { date: 'desc' } })
      const now = getToday()
      if (existing && isSameDay(existing.date, now) && now.getTime() - existing.date.getTime() < MAX_AGE_HOURS * 3_600_000) {
        return NextResponse.json({ status: 'cached' })
      }
    }

    const briefing = await runOrchestrator(family.id, { force, offline: isDemoMode })
    return NextResponse.json({ status: 'generated', source: briefing.source })
  } catch (error) {
    console.error('[POST /api/briefing/generate]', error)
    return NextResponse.json({ error: 'Briefing generation failed', details: String(error) }, { status: 500 })
  }
}
