import type { BriefingData } from '@/types';

// 30-day history ending at composite=62 (deterministic, math-only)
const demoHistoricalScores = (() => {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - i));
    const linear = 72 - (10 / 29) * i;
    const noise = Math.sin(i * 1.3) * 2.5;
    return {
      date: date.toISOString().split('T')[0],
      score: i === 29 ? 62 : Math.max(0, Math.min(100, Math.round(linear + noise))),
    };
  });
})();

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const demoBriefing: BriefingData = {
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
    {
      id: 'ins_4',
      agent: 'health',
      severity: 'info',
      text: "Salem's HbA1c is 6.8% — holding steady. Evening Metformin adherence has been inconsistent this week. One gentle reminder sent.",
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ins_5',
      agent: 'caregiver',
      severity: 'warning',
      text: 'Fatima is absorbing 72% of caregiving duties this week including 4 of 5 medical transports. Burnout risk score: 78/100. Recommend redistributing the May 11 clinic run to Salem.',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ins_6',
      agent: 'operations',
      severity: 'info',
      text: "Layla's IB Physics exam is May 12. Study blocks have been cleared on her calendar for the next 3 evenings. No conflicts detected.",
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
    {
      id: 'alert_2',
      severity: 'warning',
      text: 'Aisha reported forgetting evening medication twice last month — adherence review flagged',
      memberName: 'Aisha',
      memberId: 'mem_aisha',
      agent: 'health',
    },
    {
      id: 'alert_3',
      severity: 'warning',
      text: 'Fatima caregiver burnout risk score: 78/100 — intervention recommended',
      memberName: 'Fatima',
      memberId: 'mem_fatima',
      agent: 'caregiver',
    },
  ],
  moodScore: {
    composite: 62,
    trend: 'falling' as const,
    components: { health: 64, relational: 70, operational: 84, caregiver: 22 },
    historicalScores: demoHistoricalScores,
  },
  invisibleHours: {
    totalHours: 14.8,
    primaryCaregiverId: 'mem_fatima',
    weekOf: '2026-05-03',
    comparisonToAverage: 270,
    breakdown: {
      medical_admin: {
        hours: 3.0,
        taskCount: 12,
        description: 'Medical appointment coordination & caregiving logistics',
      },
      medication_management: {
        hours: 4.2,
        taskCount: 6,
        description: 'Weekly medication tracking and administration across family',
      },
      school_admin: {
        hours: 1.6,
        taskCount: 8,
        description: 'School communication, pickup, and activity coordination',
      },
      conflict_resolution: {
        hours: 2.5,
        taskCount: 5,
        description: 'Resolving calendar conflicts and rescheduling',
      },
      logistics: {
        hours: 3.5,
        taskCount: 35,
        description: 'Household errands, travel, and family logistics',
      },
    },
  },
};