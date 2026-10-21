import { NextRequest, NextResponse } from 'next/server'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { isDemoMode } from '@/lib/demo/mode'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { createPendingHandoffs } from '@/lib/handoffs/store'
import { buildHandoverPlan, rewordRunbooks } from '@/lib/resilience/plan'
import { MAX_ABSENCE_DAYS, simulateAbsence } from '@/lib/resilience/simulate'
import { getToday } from '@/lib/time/today'

/**
 * POST /api/resilience  { absentId, days, withPlan? }
 *
 * Runs the stress test (pure, instant, no model). With `withPlan`, also builds the handover plan,
 * lets a model reword the runbook steps (guarded; skipped in demo mode) and creates PENDING handoffs
 * for the placements. Nothing is reassigned until the recipient accepts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { absentId?: unknown; days?: unknown; withPlan?: unknown }
    const days = Number(body.days)
    if (typeof body.absentId !== 'string' || !Number.isFinite(days) || days < 1 || days > MAX_ABSENCE_DAYS) {
      return NextResponse.json({ error: `absentId and days (1 to ${MAX_ABSENCE_DAYS}) are required` }, { status: 400 })
    }

    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    if (!family.members.some((m) => m.id === body.absentId)) {
      return NextResponse.json({ error: 'Unknown member' }, { status: 400 })
    }

    const simulation = simulateAbsence(family, body.absentId, days, getToday())
    if (body.withPlan !== true) return NextResponse.json({ simulation })

    const base = buildHandoverPlan(family, simulation)
    const plan = await rewordRunbooks(family, simulation, base, { offline: isDemoMode })
    const created = await createPendingHandoffs(family.id, plan.proposals)
    return NextResponse.json({ simulation, plan, created })
  } catch (error) {
    console.error('[/api/resilience]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
