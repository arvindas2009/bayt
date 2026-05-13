import type { ConnectionOutput } from '@/types/agents'

export type DriftSeverity = 'critical' | 'warning' | 'info';

export interface DriftAlert {
  id: string;
  memberA: string;
  memberB: string;
  driftLabel: string;
  driftDays: number;
  severity: DriftSeverity;
  description: string;
  suggestion: string;
}

export interface MicroIntervention {
  id: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  action: string;
  relationship: string;
  alertId: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ConnectionMemory {
  id: string;
  quote: string;
  fullText: string;
  attribution: string;
  role: string;
  dateCaptured: string;
  tags: string[];
}

export const driftAlerts: DriftAlert[] = [
  {
    id: 'drift-01',
    memberA: 'Fatima',
    memberB: 'Aisha',
    driftLabel: '9 days',
    driftDays: 9,
    severity: 'critical',
    description: "No meaningful one-on-one conversation detected in 9 days. Fatima's last engagement with Aisha was a brief logistical check-in about medication pickup.",
    suggestion: "Schedule a 30-min video call — Aisha mentioned missing Fatima's stories about work. Thursday evening has a gap in both calendars.",
  },
  {
    id: 'drift-02',
    memberA: 'Salem',
    memberB: 'Layla',
    driftLabel: '2 weeks',
    driftDays: 14,
    severity: 'warning',
    description: "Weekend father-daughter check-ins skipped for two consecutive weeks. Salem's travel schedule and Layla's exam period overlapped.",
    suggestion: "Restart with a low-key Saturday breakfast ritual. Layla's exams end Friday — this weekend is ideal for re-establishing the habit.",
  },
  {
    id: 'drift-03',
    memberA: 'Khalid',
    memberB: 'Salem',
    driftLabel: '5 days',
    driftDays: 5,
    severity: 'info',
    description: "Khalid posted about a school drama performance on the family channel — Salem has not acknowledged or responded. Khalid mentioned it again in a side message to Layla.",
    suggestion: "Salem should reply directly to Khalid's post and ask to attend the next rehearsal. Small acknowledgment, high relational impact.",
  },
];

export const microInterventions: MicroIntervention[] = [
  {
    id: 'mi-01',
    day: 'Thu',
    action: 'Schedule Fatima & Aisha video call — 7 PM slot is open on both calendars',
    relationship: 'Fatima & Aisha',
    alertId: 'drift-01',
    effort: 'low',
  },
  {
    id: 'mi-02',
    day: 'Fri',
    action: "Salem sends Khalid a voice note about the drama performance",
    relationship: 'Khalid & Salem',
    alertId: 'drift-03',
    effort: 'low',
  },
  {
    id: 'mi-03',
    day: 'Sat',
    action: 'Salem & Layla Saturday breakfast — re-establish weekly ritual',
    relationship: 'Salem & Layla',
    alertId: 'drift-02',
    effort: 'medium',
  },
  {
    id: 'mi-04',
    day: 'Sat',
    action: 'Share Eid family photo album with Aisha via the family vault',
    relationship: 'Family & Aisha',
    alertId: 'drift-01',
    effort: 'low',
  },
  {
    id: 'mi-05',
    day: 'Sun',
    action: "Salem attends Khalid's next theater rehearsal — builds shared memory",
    relationship: 'Khalid & Salem',
    alertId: 'drift-03',
    effort: 'high',
  },
];

export const connectionMemories: ConnectionMemory[] = [
  {
    id: 'mem-01',
    quote: 'The smell of cardamom in the morning is the smell of home.',
    fullText: "The smell of cardamom in the morning is the smell of home. My mother used to grind it herself before the sun was fully up. I can still hear the sound of the mortar and pestle — that rhythm meant that the day was going to be okay, no matter what came after.",
    attribution: 'Aisha',
    role: 'Grandmother',
    dateCaptured: '2026-04-28',
    tags: ['family history', 'ritual', 'food'],
  },
  {
    id: 'mem-02',
    quote: 'Patience is not waiting — it is knowing what you are waiting for.',
    fullText: "Baba always said patience is not waiting — it is knowing what you are waiting for. I didn't understand it as a child. I thought he was just making an excuse to be slow about everything. But now, watching Khalid grow up so fast, I finally get it.",
    attribution: 'Salem',
    role: 'Father',
    dateCaptured: '2026-05-01',
    tags: ['wisdom', 'parenting', 'reflection'],
  },
  {
    id: 'mem-03',
    quote: 'Cooking for someone is the most direct way to say I love you.',
    fullText: "Teta Aisha taught me that cooking for someone is the most direct way to say I love you without saying it. We spent an entire summer making maamoul together when I was twelve. I still follow her measurements exactly — by feel, not by spoon.",
    attribution: 'Fatima',
    role: 'Mother',
    dateCaptured: '2026-04-19',
    tags: ['Aisha', 'food', 'love', 'tradition'],
  },
  {
    id: 'mem-04',
    quote: 'Teta says stars are the eyes of people who loved us first.',
    fullText: "Teta Aisha told me when I was little that stars are the eyes of people who loved us first, watching to make sure we don't forget them. I still look up sometimes. I told Teta she doesn't need to be a star yet because she is still here and I still need her.",
    attribution: 'Layla',
    role: 'Daughter',
    dateCaptured: '2026-05-03',
    tags: ['Aisha', 'childhood', 'loss', 'love'],
  },
  {
    id: 'mem-05',
    quote: 'My first real audience was Baba. He always laughed even when the joke was bad.',
    fullText: "My first real audience was Baba. He always laughed even when the joke was bad — not a fake laugh, a real one. I think that is why I started doing drama. I wanted to find more people who would laugh like that. But none of them laugh like him.",
    attribution: 'Khalid',
    role: 'Son',
    dateCaptured: '2026-05-06',
    tags: ['Salem', 'performance', 'encouragement'],
  },
  {
    id: 'mem-06',
    quote: 'There were no shortcuts with her. Everything was done properly or not at all.',
    fullText: "There were no shortcuts with her. Everything was done properly or not at all. The bread had to rise twice. The room had to be swept before guests, even if guests had already arrived. I used to think it was stubbornness. Now I call it integrity and I miss it every day.",
    attribution: 'Aisha',
    role: 'Grandmother',
    dateCaptured: '2026-04-14',
    tags: ['family history', 'values', 'memory'],
  },
];

// ─── Typed mock output for demo mode and orchestrator fallback ────────────────

export const mockConnectionOutput: ConnectionOutput = {
  syncScore: 62,
  driftAlerts: [
    {
      memberA: 'Fatima',
      memberB: 'Aisha',
      daysSinceContact: 9,
      severity: 'critical',
      reason: "No meaningful one-on-one conversation in 9 days. Last engagement was a brief logistical check-in about medication pickup.",
      suggestion: "Schedule a 30-min video call — Aisha mentioned missing Fatima's stories about work. Thursday evening has a gap in both calendars.",
    },
    {
      memberA: 'Salem',
      memberB: 'Layla',
      daysSinceContact: 14,
      severity: 'moderate',
      reason: "Weekend father-daughter check-ins skipped for two consecutive weeks due to Salem's travel and Layla's exam period.",
      suggestion: "Restart with a low-key Saturday breakfast ritual. Layla's exams end Friday — this weekend is ideal.",
    },
    {
      memberA: 'Khalid',
      memberB: 'Salem',
      daysSinceContact: 5,
      severity: 'minor',
      reason: "Khalid posted about a school drama performance on the family channel — Salem has not acknowledged or responded.",
      suggestion: "Salem should reply directly to Khalid's post and ask to attend the next rehearsal. Small acknowledgment, high relational impact.",
    },
  ],
  microActions: [
    {
      day: 'Thu',
      type: 'quick',
      description: "Schedule Fatima & Aisha video call — 7 PM slot is open on both calendars",
      membersInvolved: ['Fatima', 'Aisha'],
    },
    {
      day: 'Fri',
      type: 'quick',
      description: "Salem sends Khalid a voice note about the drama performance",
      membersInvolved: ['Salem', 'Khalid'],
    },
    {
      day: 'Sat',
      type: 'medium',
      description: "Salem & Layla Saturday breakfast — re-establish weekly ritual",
      membersInvolved: ['Salem', 'Layla'],
    },
    {
      day: 'Sat',
      type: 'quick',
      description: "Share Eid family photo album with Aisha via the family vault",
      membersInvolved: ['Aisha'],
    },
    {
      day: 'Sun',
      type: 'invest',
      description: "Salem attends Khalid's next theater rehearsal — builds shared memory",
      membersInvolved: ['Salem', 'Khalid'],
    },
  ],
  memoriesVault: connectionMemories.map((m) => ({
    quote: m.quote,
    attribution: m.attribution,
    role: m.role,
    date: m.dateCaptured,
  })),
  repairProtocols: [
    {
      id: 'rp-01',
      fromMemberId: 'mem_salem',
      toMemberId: 'mem_layla',
      driftDays: 9,
      driftCause: 'Weekend father-daughter check-ins skipped for two consecutive weeks due to travel.',
      status: 'active',
      startedAt: '2026-05-10T00:00:00Z',
      sequence: [
        { day: 1, type: 'memory_share', instruction: 'Share a memory from when Layla was little.', estimatedMinutes: 2, completed: false },
        { day: 3, type: 'activity_suggestion', instruction: '15min drive together, she chooses the music.', estimatedMinutes: 15, completed: false },
        { day: 5, type: 'conversation_starter', instruction: 'Ask about her karate progress without making it about competition.', estimatedMinutes: 5, completed: false },
        { day: 7, type: 'scheduled_moment', instruction: 'Schedule a Saturday breakfast, just the two of you.', estimatedMinutes: 60, completed: false }
      ]
    },
    {
      id: 'rp-02',
      fromMemberId: 'mem_fatima',
      toMemberId: 'mem_aisha',
      driftDays: 6,
      driftCause: 'No meaningful one-on-one conversation detected recently.',
      status: 'active',
      startedAt: '2026-05-08T00:00:00Z',
      sequence: [
        { day: 1, type: 'conversation_starter', instruction: 'Send Aisha a short voice note about your day.', estimatedMinutes: 2, completed: true },
        { day: 3, type: 'activity_suggestion', instruction: 'Bring Aisha to sit with you while cooking.', estimatedMinutes: 20, completed: false },
        { day: 5, type: 'memory_share', instruction: 'Ask Aisha to share a recipe she has not cooked in years.', estimatedMinutes: 10, completed: false },
        { day: 7, type: 'scheduled_moment', instruction: 'Cook the recipe together.', estimatedMinutes: 45, completed: false }
      ]
    }
  ]
};
