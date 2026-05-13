import { NextRequest, NextResponse } from 'next/server'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { runConnectionAgent } from '@/lib/agents/connection-agent'
import { isDemoMode } from '@/lib/demo/mode'
import { mockConnectionOutput } from '@/lib/data/mock-connection'

export async function POST(req: NextRequest) {
  if (isDemoMode) {
    return NextResponse.json({ ...mockConnectionOutput, _mock: true, _error: 'Demo mode preview' })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const familyId: string | undefined = body?.familyId

    console.log('[/api/agents/connection] POST — familyId:', familyId ?? '(none, will use default)')

    const family = await getFamilyWithEverything(familyId)
    if (!family) {
      console.error('[/api/agents/connection] Family not found — familyId:', familyId)
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    console.log('[/api/agents/connection] Family loaded:', family.name, '| members:', family.members.length)

    const output = await runConnectionAgent(family)

    console.log(
      '[/api/agents/connection] Agent complete — driftAlerts:', output.driftAlerts.length,
      '| microActions:', output.microActions.length,
      '| memoriesVault:', output.memoriesVault.length,
      '| syncScore:', output.syncScore,
    )

    return NextResponse.json(output)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[/api/agents/connection] Unhandled error:', error)
    console.warn('[/api/agents/connection] Returning mock fallback data')
    return NextResponse.json({ ...mockConnectionOutput, _mock: true, _error: message })
  }
}
