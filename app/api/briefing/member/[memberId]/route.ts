import { NextRequest, NextResponse } from 'next/server'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { getFamilyWithEverything, getHandoffs } from '@/lib/db/queries'
import { isDemoMode } from '@/lib/demo/mode'
import { generateMemberBriefing } from '@/lib/agents/adaptive-briefing'
import { getLatestRun } from '@/lib/agents/runs'
import { buildPriorityItems } from '@/lib/briefing/rank'
import { computeLoad } from '@/lib/load/model'
import { getToday } from '@/lib/time/today'
import type { ConnectionOutput, MemberBriefing } from '@/types/agents'

// In-memory cache. The key includes a fingerprint of the member's ranked items, so accepting a
// handoff (which changes the ranking) invalidates it immediately.
const cache = new Map<string, MemberBriefing>()

/**
 * `?wording=skip` returns the deterministic briefing straight away, with no model call, so the page
 * can show the facts while the worded version (the plain URL) is still being written.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const skipWording = req.nextUrl.searchParams.get('wording') === 'skip'

    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    const member = family?.members.find((m) => m.id === memberId)
    if (!family || !member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const now = getToday()
    const handoffs = await getHandoffs(family.id)
    const withHandoffs = { ...family, handoffs }
    const load = computeLoad(withHandoffs, now)
    const items = buildPriorityItems(withHandoffs, now, load)

    const fingerprint = items
      .filter((i) => i.personIds.includes(memberId))
      .slice(0, 4)
      .map((i) => i.id)
      .join(',')
    const offline = isDemoMode || skipWording
    const key = `${memberId}:${now.toISOString().slice(0, 10)}:${offline ? 'plain' : 'worded'}:${fingerprint}`
    const cached = cache.get(key)
    if (cached) return NextResponse.json(cached)

    // One connection nudge for this member, taken from the latest Connection run (if any).
    const connection = await getLatestRun<ConnectionOutput>(family.id, 'connection')
    const nudge = connection?.output.microActions.find((a) => a.memberIds.includes(memberId))

    const briefing = await generateMemberBriefing(
      member,
      withHandoffs,
      { load, items, connectionAction: nudge ? { text: nudge.description } : undefined },
      { offline, now },
    )
    cache.set(key, briefing)
    return NextResponse.json(briefing)
  } catch (error) {
    console.error('[GET /api/briefing/member]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Briefing failed' }, { status: 500 })
  }
}
