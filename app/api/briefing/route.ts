import { NextResponse } from 'next/server';
import { getFamilyWithEverything } from '@/lib/db/queries';
import prisma from '@/lib/db/prisma';
import { isDemoMode, demoBriefing } from '@/lib/demo/mode';
import { calculateInvisibleHours } from '@/lib/utils/invisible-hours';
import { calculateMoodScore } from '@/lib/utils/mood-score';
import type { HealthOutput, StressWindow, DriftAlert } from '@/types/agents';

// ─── Mood score inputs (derived from Al-Salem family context) ─────────────────

const MOCK_HEALTH_FOR_MOOD: HealthOutput = {
  familyPatterns: [],
  memberSummaries: [
    { memberId: 'mem_salem',  overallStatus: 'monitor', topFlags: [], keyMetrics: [] },
    { memberId: 'mem_fatima', overallStatus: 'monitor', topFlags: [], keyMetrics: [] },
    { memberId: 'mem_layla',  overallStatus: 'good',    topFlags: [], keyMetrics: [] },
    { memberId: 'mem_khalid', overallStatus: 'good',    topFlags: [], keyMetrics: [] },
    { memberId: 'mem_aisha',  overallStatus: 'alert',   topFlags: [], keyMetrics: [] },
  ],
  crossLinks: [],
};

const MOCK_STRESS_FORECAST: StressWindow[] = [
  { date: '2026-05-10', risk: 'elevated' },
  { date: '2026-05-11', risk: 'high'     },
  { date: '2026-05-12', risk: 'elevated' },
  { date: '2026-05-13', risk: 'clear'    },
  { date: '2026-05-14', risk: 'clear'    },
  { date: '2026-05-15', risk: 'elevated' },
  { date: '2026-05-16', risk: 'clear'    },
];

const MOCK_DRIFT_ALERTS: DriftAlert[] = [
  { severity: 'moderate' },
  { severity: 'minor'    },
];

// ─── Fallback Working Briefing ────────────────────────────────────────────────
const FALLBACK_MOCK_BRIEFING = {
  date: new Date().toISOString(),
  summary:
    'Three operational conflicts flagged today. Two health patterns require attention across Salem and Fatima. Caregiver load remains skewed — Fatima is absorbing 72% of logistics duties.',
  timeSavedHours: 4.2,
  dailyBreakdown: [
    { day: 'Mon', hours: 1.2 },
    { day: 'Tue', hours: 2.0 },
    { day: 'Wed', hours: 0.8 },
    { day: 'Thu', hours: 3.2 },
    { day: 'Fri', hours: 4.2 },
    { day: 'Sat', hours: 0.5 },
    { day: 'Sun', hours: 0.0 },
  ],
  memoryOfTheDay: {
    quote:
      "Salem used to climb the lemon tree behind our old house in Al Ain. He fell once, broke his wrist, and refused to cry. Khalid has that same stubbornness.",
    attribution: 'Aisha',
    dateCaptured: '2026-05-07',
  },
  insights: [
    {
      id: 'ins_1',
      agent: 'operations',
      severity: 'warning',
      text: "Salem's Regional Contractor Visit overlaps Khalid's Parent-Teacher Conference at 1:00 PM today. Fatima's design call ends at 12:00 — she can cover the school.",
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ins_2',
      agent: 'operations',
      severity: 'warning',
      text: "Aisha's physiotherapy and Fatima's dentist appointment both land at 10:00 AM on May 9. Fatima usually drives — alternative transport required.",
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ins_3',
      agent: 'health',
      severity: 'warning',
      text: "Layla's Vitamin D (22 ng/mL) and Fatima's (19 ng/mL) are both below threshold. Shared indoor environment likely contributing — outdoor time protocol recommended.",
      timestamp: new Date().toISOString(),
    },
  ],
  alerts: [
    {
      id: 'alert_1',
      severity: 'critical',
      text: "Khalid's EpiPen expires June 2026 — refill due within 3 weeks",
      memberName: 'Khalid',
      memberId: 'mem_khalid',
      agent: 'health',
    },
  ],
};

export async function GET() {
  if (isDemoMode) {
    return NextResponse.json(demoBriefing);
  }

  const family = await getFamilyWithEverything();
  if (!family) return NextResponse.json(null);

  const briefing = await prisma.briefing.findFirst({
    where: { familyId: family.id },
    orderBy: { date: 'desc' },
  });

  const invisibleHours = calculateInvisibleHours(family);

  const moodScore = calculateMoodScore({
    healthOutput: MOCK_HEALTH_FOR_MOOD,
    caregiverLoad: 78,
    stressForecast: MOCK_STRESS_FORECAST,
    driftAlerts: MOCK_DRIFT_ALERTS,
    invisibleHours,
  });

  if (!briefing) {
    return NextResponse.json({ ...FALLBACK_MOCK_BRIEFING, invisibleHours, moodScore });
  }

  // Reconstruct BriefingData from DB row
  const opsOutput = JSON.parse(briefing.opsOutput);
  const alerts = JSON.parse(briefing.alerts);

  return NextResponse.json({
    date: briefing.date.toISOString(),
    summary: briefing.summary,
    insights: opsOutput.insights,
    timeSavedHours: briefing.timeSaved,
    dailyBreakdown: opsOutput.dailyBreakdown,
    memoryOfTheDay: opsOutput.memoryOfTheDay,
    alerts,
    invisibleHours,
    moodScore,
  });
}
