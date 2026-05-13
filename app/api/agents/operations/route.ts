import { NextRequest, NextResponse } from 'next/server'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { runOperationsAgent } from '@/lib/agents/operations-agent'
import { isDemoMode } from '@/lib/demo/mode'
import type { OperationsOutput } from '@/types/agents'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const mockOutput: OperationsOutput = {
  weeklyPlan: DAYS.map((day) => ({
    day,
    breakfast: { name: 'Oatmeal & Berries', tags: ['Quick'], calories: 350, suitableFor: ['mem_salem', 'mem_fatima', 'mem_layla', 'mem_khalid', 'mem_aisha'] },
    lunch: { name: 'Chicken Wrap', tags: ['High Protein'], calories: 450, suitableFor: ['mem_salem', 'mem_fatima', 'mem_layla', 'mem_khalid'] },
    dinner: { name: day === 'Wed' ? '30-min Lentil Stew' : 'Grilled Salmon & Veg', tags: ['Low Prep', 'Healthy'], calories: 550, suitableFor: ['mem_salem', 'mem_fatima', 'mem_layla', 'mem_khalid', 'mem_aisha'] },
  })),
  calendarConflicts: [
    {
      members: ['mem_salem', 'mem_khalid', 'mem_fatima'],
      date: '2026-05-08',
      conflict: "Salem's Site Visit overlaps Khalid's Parent-Teacher Conference",
      suggestion: 'Fatima is available during this time and can be reassigned to the school.',
    },
  ],
  schoolDrafts: [
    {
      memberId: 'mem_khalid',
      to: 'mr.smith@school.edu',
      subject: 'Late Arrival for Khalid',
      preview: 'Khalid will be arriving late due to...',
      body: 'Dear Mr. Smith, Khalid has a dentist appointment this morning and will arrive by 10:30 AM. Regards, Fatima.',
    },
  ],
  timeSavedHours: 1.5,
  schoolHealthBriefs: [
    {
      memberId: 'mem_khalid',
      memberName: 'Khalid',
      schoolName: 'Al-Rashid Academy',
      condition: 'Severe Nut Allergy',
      draftSubject: 'URGENT: Severe Nut Allergy Protocol — Khalid Al-Salem',
      draftBody: `Dear Al-Rashid Academy Team,

I am writing to bring your urgent attention to a critical health matter concerning my son, Khalid Al-Salem (Year 5). Khalid has a confirmed severe allergy to all tree nuts and peanuts, with anaphylaxis risk. This requires strict management at school, particularly in the canteen and during class activities involving food.

We kindly request that the school canteen ensures Khalid's meal station is entirely nut-free and that staff are aware of cross-contamination risks. Khalid carries a prescribed EpiPen at all times; we ask that a second device be kept on file with the school nurse for emergency use.

Please confirm in writing that his allergy protocol is current, that all relevant teachers and canteen staff have been notified, and that his EpiPen storage location is documented. We are happy to provide updated medical documentation from his allergist on request.

Thank you for your attentiveness to Khalid's safety. Please do not hesitate to contact me directly.

Warm regards,
Fatima Al-Salem`,
      urgencyLevel: 'urgent',
      triggerReason: 'Allergy protocol must be current and confirmed with canteen staff',
      validUntil: '2026-05-24',
    },
    {
      memberId: 'mem_khalid',
      memberName: 'Khalid',
      schoolName: 'Al-Rashid Academy',
      condition: 'ADHD + Methylphenidate 10mg',
      draftSubject: 'Scheduling Recommendation for Khalid — Morning Cognitive Window',
      draftBody: `Dear Al-Rashid Academy Team,

I hope this message finds you well. I am writing regarding my son Khalid Al-Salem (Year 5), who takes Methylphenidate 10mg each morning as part of his ADHD management plan under the supervision of his paediatrician.

Methylphenidate reaches peak effectiveness approximately 1–2 hours after administration, which means Khalid's window of strongest focus and cognitive performance is typically between 8:30 AM and 12:30 PM. We would be most grateful if the school could, where timetabling allows, schedule higher-demand academic tasks — such as mathematics assessments, reading comprehension, and any test situations — during this morning window.

This is a standing recommendation from Khalid's care team and is not related to any acute concern. We simply wish to ensure that his learning environment supports him in the moments when he is best able to perform. Please feel free to reach out if you would like to discuss further or if a formal letter from his paediatrician would be helpful.

Thank you for your continued support of Khalid's education.

Warm regards,
Fatima Al-Salem`,
      urgencyLevel: 'routine',
      triggerReason: 'Standing recommendation to support ADHD medication schedule',
      validUntil: '2026-08-08',
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

    const family = await getFamilyWithEverything(familyId)
    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    const output = await runOperationsAgent(family)
    return NextResponse.json(output)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[/api/agents/operations]', error)
    // Return mock data so the UI always has something to render
    console.warn('[/api/agents/operations] Returning mock fallback data')
    return NextResponse.json({ ...mockOutput, _mock: true, _error: message })
  }
}
