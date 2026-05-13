import { NextRequest, NextResponse } from 'next/server'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { runCaregiverAgent } from '@/lib/agents/caregiver-agent'
import { isDemoMode } from '@/lib/demo/mode'
import { mockCaregiverOutput } from '@/lib/data/mock-caregiver'

export async function POST(req: NextRequest) {
  if (isDemoMode) {
    return NextResponse.json({ ...mockCaregiverOutput, _mock: true, _error: 'Demo mode preview' })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const familyId: string | undefined = body?.familyId

    console.log('[/api/agents/caregiver] POST — familyId:', familyId ?? '(none, will use default)')

    const family = await getFamilyWithEverything(familyId)
    if (!family) {
      console.error('[/api/agents/caregiver] Family not found — familyId:', familyId)
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    console.log('[/api/agents/caregiver] Family loaded:', family.name, '| members:', family.members.length)

    const output = await runCaregiverAgent(family)

    const atRisk = output.atRiskMember
      ? `${output.atRiskMember.name} score=${output.atRiskMember.score}`
      : 'none'

    console.log(
      '[/api/agents/caregiver] Agent complete — loadDistribution:', output.loadDistribution.length,
      '| atRiskMember:', atRisk,
      '| autoInterventions:', output.autoInterventions.length,
    )

    return NextResponse.json(output)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[/api/agents/caregiver] Unhandled error:', error)
    console.warn('[/api/agents/caregiver] Returning mock fallback data')
    return NextResponse.json({ ...mockCaregiverOutput, _mock: true, _error: message })
  }
}
