import { NextRequest, NextResponse } from 'next/server'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { runHealthAgent } from '@/lib/agents/health-agent'
import { isDemoMode } from '@/lib/demo/mode'
import type { HealthOutput } from '@/types/agents'

const mockOutput: HealthOutput = {
  familyPatterns: [
    {
      id: 'pat_demo_1',
      title: 'Shared Vitamin D Deficiency',
      description: 'Layla and Fatima both showing sub-optimal Vitamin D levels.',
      recommendation: 'Initiate outdoor family protocol. Schedule 30 mins direct sunlight weekend mornings.',
      affectedMembers: ['mem_layla', 'mem_fatima'],
      severity: 'warning',
      confidence: 0.85,
    },
    {
      id: 'pat_demo_2',
      title: "Salem's HbA1c Stability",
      description: "Salem's HbA1c is 6.8% — holding steady with current medication regimen.",
      recommendation: 'Continue monitoring. Evening Metformin adherence needs improvement.',
      affectedMembers: ['mem_salem'],
      severity: 'info',
      confidence: 0.92,
    },
  ],
  memberSummaries: [
    { memberId: 'mem_salem', overallStatus: 'monitor', topFlags: ['HbA1c 6.8%', 'Evening medication adherence'], keyMetrics: [{ label: 'HbA1c', value: '6.8%' }, { label: 'BP', value: '128/82' }] },
    { memberId: 'mem_fatima', overallStatus: 'monitor', topFlags: ['Vitamin D 19 ng/mL'], keyMetrics: [{ label: 'Vitamin D', value: '19 ng/mL' }] },
    { memberId: 'mem_layla', overallStatus: 'monitor', topFlags: ['Vitamin D 22 ng/mL'], keyMetrics: [{ label: 'Vitamin D', value: '22 ng/mL' }] },
    { memberId: 'mem_khalid', overallStatus: 'good', topFlags: ['EpiPen expires June 2026'], keyMetrics: [] },
    { memberId: 'mem_aisha', overallStatus: 'monitor', topFlags: ['Medication adherence', 'Physiotherapy compliance'], keyMetrics: [] },
  ],
  crossLinks: [
    { fromMember: 'mem_fatima', toMember: 'mem_layla', patternId: 'pat_demo_1', strength: 0.85 },
  ],
  healthTwins: [
    {
      memberId: 'mem_salem',
      relatedAncestorId: 'mem_aisha',
      relatedAncestorPattern: 'Hypertension → T2D cardiovascular cascade (Aisha, 71)',
      geneticRiskFactors: ['Type 2 Diabetes (paternal line)', 'Hypertension predisposition', 'Osteoporosis risk (maternal)'],
      interventionsApplied: ['Reduced refined carbs in weekly meal plan', 'Added 20-min evening walk to schedule', 'Metformin adherence reminder added'],
      currentTrajectory: [
        { year: 2026, riskScore: 52, dominantRisk: 'T2D progression' },
        { year: 2029, riskScore: 61, dominantRisk: 'Cardiovascular risk rising' },
        { year: 2032, riskScore: 69, dominantRisk: 'Hypertension onset likely' },
        { year: 2035, riskScore: 76, dominantRisk: 'Cardiac event risk window' },
        { year: 2038, riskScore: 82, dominantRisk: 'Multi-system metabolic strain' },
        { year: 2041, riskScore: 87, dominantRisk: 'High cardiovascular burden' },
      ],
      projectedTrajectory: [
        { year: 2026, riskScore: 52, dominantRisk: 'T2D progression' },
        { year: 2029, riskScore: 54, dominantRisk: 'Stabilised with lifestyle changes' },
        { year: 2032, riskScore: 57, dominantRisk: 'Controlled metabolic markers' },
        { year: 2035, riskScore: 59, dominantRisk: 'Maintained HbA1c range' },
        { year: 2038, riskScore: 62, dominantRisk: 'Moderate cardiovascular monitoring' },
        { year: 2041, riskScore: 64, dominantRisk: 'Age-appropriate risk profile' },
      ],
    },
    {
      memberId: 'mem_khalid',
      relatedAncestorId: 'mem_salem',
      relatedAncestorPattern: 'Early metabolic markers → T2D onset (Salem, 45)',
      geneticRiskFactors: ['T2D genetic predisposition (paternal)', 'Insulin resistance risk', 'Sedentary pattern marker'],
      interventionsApplied: ['Added after-school sports activity to schedule', 'Reduced sugary drinks in meal plan', 'Annual fasting glucose screening flagged'],
      currentTrajectory: [
        { year: 2026, riskScore: 18, dominantRisk: 'Early metabolic markers' },
        { year: 2029, riskScore: 27, dominantRisk: 'Insulin sensitivity decline' },
        { year: 2032, riskScore: 38, dominantRisk: 'Pre-diabetic range risk' },
        { year: 2035, riskScore: 49, dominantRisk: 'T2D onset risk elevated' },
        { year: 2038, riskScore: 58, dominantRisk: 'Likely T2D diagnosis window' },
        { year: 2041, riskScore: 65, dominantRisk: 'T2D management required' },
      ],
      projectedTrajectory: [
        { year: 2026, riskScore: 18, dominantRisk: 'Early metabolic markers' },
        { year: 2029, riskScore: 19, dominantRisk: 'Stable with exercise habit' },
        { year: 2032, riskScore: 21, dominantRisk: 'Low metabolic risk' },
        { year: 2035, riskScore: 24, dominantRisk: 'Normal range maintained' },
        { year: 2038, riskScore: 27, dominantRisk: 'Healthy metabolic profile' },
        { year: 2041, riskScore: 30, dominantRisk: 'Well below T2D threshold' },
      ],
    },
    {
      memberId: 'mem_layla',
      relatedAncestorId: 'mem_fatima',
      relatedAncestorPattern: 'Iron deficiency + anxiety pattern (Fatima, 42)',
      geneticRiskFactors: ['Iron deficiency anemia (maternal)', 'Anxiety predisposition', 'Hormonal iron loss risk (adolescent)'],
      interventionsApplied: ['Iron-rich foods added to weekly meal plan', 'Vitamin C pairing included in breakfast', 'Mood check-in added to weekly family agenda'],
      currentTrajectory: [
        { year: 2026, riskScore: 28, dominantRisk: 'Low iron + emerging anxiety' },
        { year: 2029, riskScore: 36, dominantRisk: 'Iron deficiency anaemia risk' },
        { year: 2032, riskScore: 42, dominantRisk: 'Anxiety pattern consolidating' },
        { year: 2035, riskScore: 47, dominantRisk: 'Fatigue + mood instability' },
        { year: 2038, riskScore: 51, dominantRisk: 'Chronic iron-anxiety cycle' },
        { year: 2041, riskScore: 54, dominantRisk: 'Moderate multi-system burden' },
      ],
      projectedTrajectory: [
        { year: 2026, riskScore: 28, dominantRisk: 'Low iron + emerging anxiety' },
        { year: 2029, riskScore: 26, dominantRisk: 'Iron supplementation effective' },
        { year: 2032, riskScore: 24, dominantRisk: 'Stable iron levels' },
        { year: 2035, riskScore: 23, dominantRisk: 'Maintained wellness baseline' },
        { year: 2038, riskScore: 24, dominantRisk: 'Normal range sustained' },
        { year: 2041, riskScore: 25, dominantRisk: 'Age-appropriate risk profile' },
      ],
    },
  ],
}

export async function POST(req: NextRequest) {
  if (isDemoMode) {
    return NextResponse.json({ ...mockOutput, _mock: true, _error: 'Demo mode preview' })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const familyId: string | undefined = body?.familyId

    console.log('[/api/agents/health] POST — familyId:', familyId ?? '(none, will use default)')

    const family = await getFamilyWithEverything(familyId)
    if (!family) {
      console.error('[/api/agents/health] Family not found — familyId:', familyId)
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    console.log('[/api/agents/health] Family loaded:', family.name, '| members:', family.members.length)

    const output = await runHealthAgent(family)

    console.log('[/api/agents/health] Agent complete — patterns:', output.familyPatterns.length, '| summaries:', output.memberSummaries.length, '| crossLinks:', output.crossLinks.length)

    return NextResponse.json(output)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[/api/agents/health] Unhandled error:', error)
    // Return mock data so the UI always has something to render
    console.warn('[/api/agents/health] Returning mock fallback data')
    return NextResponse.json({ ...mockOutput, _mock: true, _error: message })
  }
}
