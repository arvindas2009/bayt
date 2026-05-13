import type { CaregiverOutput } from '@/types/agents'

export interface LoadDistribution {
  member: string;
  score: number;
}

export interface AutoIntervention {
  id: string;
  action: string;
  appliedAt: string;
  protects: string;
  category: 'time-block' | 'task-shift' | 'notification';
}

export interface LoadBreakdownRow {
  category: string;
  Salem: number;
  Fatima: number;
  Layla: number;
  Khalid: number;
  Aisha: number;
}

export interface BurnoutHistoryPoint {
  week: string;
  load: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const atRiskMember = 'Fatima';
export const riskScore = 87;
export const burnoutThreshold = 75;

export const loadDistribution: LoadDistribution[] = [
  { member: 'Fatima', score: 87 },
  { member: 'Aisha',  score: 34 },
  { member: 'Layla',  score: 23 },
  { member: 'Salem',  score: 18 },
  { member: 'Khalid', score: 12 },
];

export const autoInterventions: AutoIntervention[] = [
  {
    id: 'ai-01',
    action: "Saturday 10am–12pm blocked for Fatima — no tasks, no reminders",
    appliedAt: '2026-05-08T06:00:00',
    protects: 'Personal time',
    category: 'time-block',
  },
  {
    id: 'ai-02',
    action: "Khalid's school pickup moved to Salem this week (Thu & Fri)",
    appliedAt: '2026-05-07T18:30:00',
    protects: 'Logistical load',
    category: 'task-shift',
  },
  {
    id: 'ai-03',
    action: "Aisha's medication reminders rerouted to Salem's phone until Sunday",
    appliedAt: '2026-05-07T18:31:00',
    protects: 'Medical coordination',
    category: 'notification',
  },
];

export const loadBreakdown: LoadBreakdownRow[] = [
  { category: 'Meals',        Salem: 10, Fatima: 75, Layla: 30, Khalid: 5,  Aisha: 15 },
  { category: 'Medical',      Salem: 5,  Fatima: 90, Layla: 10, Khalid: 0,  Aisha: 20 },
  { category: 'School Admin', Salem: 20, Fatima: 80, Layla: 40, Khalid: 5,  Aisha: 0  },
  { category: 'Social',       Salem: 25, Fatima: 60, Layla: 35, Khalid: 20, Aisha: 55 },
  { category: 'Emotional',    Salem: 30, Fatima: 95, Layla: 45, Khalid: 15, Aisha: 40 },
];

export const burnoutHistory: BurnoutHistoryPoint[] = [
  { week: 'Apr 7',  load: 44 },
  { week: 'Apr 14', load: 53 },
  { week: 'Apr 21', load: 61 },
  { week: 'Apr 28', load: 68 },
  { week: 'May 5',  load: 87 },
];

// ─── Typed mock output for demo mode and orchestrator fallback ────────────────

export const mockCaregiverOutput: CaregiverOutput = {
  loadDistribution: loadDistribution.map((l) => ({
    memberName: l.member,
    score: l.score,
  })),
  atRiskMember: {
    name: atRiskMember,
    score: riskScore,
    threshold: burnoutThreshold,
    pointsAbove: riskScore - burnoutThreshold,
    daysWithoutRest: 14,
    summary: "Fatima is carrying medical coordination for Aisha and both children, managing all school admin, and absorbing the household's primary emotional labor — simultaneously, for over two weeks without a rest block.",
  },
  autoInterventions: autoInterventions.map((ai) => ({
    description: ai.action,
    type:
      ai.category === 'time-block'
        ? 'personal_time'
        : ai.category === 'task-shift'
          ? 'logistical_load'
          : 'medical_coordination',
  })),
  loadBreakdownByCategory: loadBreakdown.map((row) => ({
    category: row.category,
    scores: {
      Salem: row.Salem,
      Fatima: row.Fatima,
      Layla: row.Layla,
      Khalid: row.Khalid,
      Aisha: row.Aisha,
    },
  })),
};
