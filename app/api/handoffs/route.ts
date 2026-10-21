import { NextRequest, NextResponse } from 'next/server'
import { getFamilyWithEverything, getHandoffs } from '@/lib/db/queries'
import type { HandoffStatus } from '@/types/family'

/** GET /api/handoffs?toId=…&status=pending : the consent inbox. */
export async function GET(req: NextRequest) {
  const family = await getFamilyWithEverything()
  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const toId = searchParams.get('toId')
  const status = searchParams.get('status') as HandoffStatus | null

  const handoffs = (await getHandoffs(family.id, status ?? undefined)).filter((h) => !toId || h.toId === toId)
  return NextResponse.json(handoffs)
}
