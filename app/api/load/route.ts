import { NextResponse } from 'next/server'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { computeLoad } from '@/lib/load/model'
import { getToday } from '@/lib/time/today'
import type { SourceRef } from '@/types/agents'

const PER_MEMBER = 6

/** GET /api/load -> the records behind each member's number, for the "Why?" popovers. */
export async function GET() {
  try {
    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

    const report = computeLoad(family, getToday())
    const sourcesByMember: Record<string, SourceRef[]> = {}
    for (const m of report.members) {
      sourcesByMember[m.memberId] = report.items
        .filter((i) => i.ownerId === m.memberId)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, PER_MEMBER)
        .map((i) => ({ type: i.kind, id: i.id }))
    }
    return NextResponse.json({ sourcesByMember })
  } catch (error) {
    console.error('[/api/load]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
