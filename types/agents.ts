export type AgentStatus = 'live' | 'preview' | 'idle' | 'thinking'

export type AgentName = 'operations' | 'health' | 'connection' | 'caregiver'

export interface AgentResponseMeta {
  /** True when an AI-dependent part of the result is a built-in fallback ("Preview"). */
  _mock?: boolean
  _error?: string
  /** When the underlying run was produced. */
  _generatedAt?: string
}

export type InsightSeverity = 'info' | 'warning' | 'critical'

/**
 * Evidence pointer: the exact record an insight was derived from. Resolved to titles and dates by
 * the "Why?" popover. IDs that do not exist in the database are dropped before display.
 */
export interface SourceRef {
  type: 'event' | 'medication' | 'obligation' | 'handoff'
  id: string
}

export interface BriefingInsight {
  id: string
  agent: AgentName
  severity: InsightSeverity
  text: string
  timestamp: string
  /** The records this insight was derived from (shown in the "Why?" popover). */
  sources?: SourceRef[]
}

export interface BriefingAlert {
  id: string
  severity: InsightSeverity
  text: string
  memberName: string
  memberId: string
  agent: AgentName
  sources?: SourceRef[]
}

/** The single most important, specific thing to act on: always names a person, a time and a consequence. */
export interface TodayPriority {
  action: string
  consequence: string
  /** ISO moment it happens or is due; null when it has no date. */
  at: string | null
  severity: InsightSeverity
  personIds: string[]
  sources: SourceRef[]
}

export interface CapturedMemory {
  quote: string
  attribution: string
  dateCaptured: string
}

/** Live load numbers from the single load model, shipped with the briefing. */
export interface LoadSnapshot {
  totalHours: number
  windowStart: string
  members: { memberId: string; hours: number; score: number; shareOfLoad: number; daysWithoutRest: number }[]
}

export interface BriefingData {
  date: string
  summary: string
  insights: BriefingInsight[]
  timeSavedHours: number
  dailyBreakdown: { day: string; hours: number }[]
  memoryOfTheDay?: CapturedMemory
  alerts: BriefingAlert[]
  invisibleHours?: InvisibleHoursReport
  /** Live top priority for the family, derived deterministically. */
  priority?: TodayPriority | null
  load?: LoadSnapshot
  /** What the Time Dividend is made of, so the number can be audited. */
  dividendLines?: { label: string; count: number; minutes: number }[]
  /** 'llm' when the composer polished the wording, 'rules' when composed without a model. */
  source?: 'llm' | 'rules'
}

export interface MealSubstitution {
  memberId: string
  name: string
  ingredients: string[]
  /** Which constraint the main dish broke for this member, e.g. "vegetarian (chicken)". */
  reason: string
}

export interface MealSummary {
  name: string
  tags: string[]
  calories: number
  /** Member ids who can eat this dish as served. Recomputed by the validator, never trusted from the LLM. */
  suitableFor: string[]
  /** What the validator checks. Lowercase ingredient words. */
  ingredients?: string[]
  /** Named alternatives for members the dish does not suit. */
  substitutions?: MealSubstitution[]
}

export interface DayPlan {
  day: string
  breakfast: MealSummary
  lunch: MealSummary
  dinner: MealSummary
}

export interface CalendarConflict {
  /** Member ids on the hook for the clashing events. */
  members: string[]
  /** ISO moment of the first event. */
  date: string
  conflict: string
  suggestion: string
  sources?: SourceRef[]
}

export interface SchoolDraft {
  memberId: string
  to: string
  subject: string
  preview: string
  body: string
}

export interface SchoolHealthBrief {
  memberId: string
  memberName: string
  schoolName: string
  condition: string
  draftSubject: string
  draftBody: string
  urgencyLevel: 'routine' | 'seasonal' | 'urgent'
  triggerReason: string
  validUntil: string
}

export interface OperationsOutput extends AgentResponseMeta {
  weeklyPlan: DayPlan[]
  calendarConflicts: CalendarConflict[]
  schoolDrafts: SchoolDraft[]
  timeSavedHours: number
  schoolHealthBriefs: SchoolHealthBrief[]
}

export interface FamilyPattern {
  id: string
  title: string
  affectedMembers: string[]
  severity: InsightSeverity
  description: string
  recommendation: string
  confidence: number
}

export interface MemberSummary {
  memberId: string
  overallStatus: 'good' | 'monitor' | 'alert'
  topFlags: string[]
  keyMetrics: { label: string; value: string }[]
}

export interface CrossLink {
  fromMember: string
  toMember: string
  patternId: string
  strength: number
}

export interface HealthOutput extends AgentResponseMeta {
  familyPatterns: FamilyPattern[]
  memberSummaries: MemberSummary[]
  crossLinks: CrossLink[]
}

// ─── Connection Agent ─────────────────────────────────────────────────────────

export interface ConnectionDriftAlert {
  /** Given names, kept for display. */
  memberA: string
  memberB: string
  memberAId: string
  memberBId: string
  /** Whole days since the last SHARED CALENDAR EVENT (30 means "none in the last 30 days"). */
  daysSinceContact: number
  /** Derived from the gap alone; the UI no longer needs to show it. */
  severity: 'critical' | 'moderate' | 'minor'
  /** What the calendar data shows. Never claims anything about conversations. */
  reason: string
  suggestion: string
  sources: SourceRef[]
}

export interface ConnectionMicroAction {
  /** Weekday abbreviation, e.g. "Sat". */
  day: string
  /** ISO moment the action is proposed for. */
  date: string
  type: 'quick' | 'medium' | 'invest'
  description: string
  /** Given names. */
  membersInvolved: string[]
  memberIds: string[]
}

export interface MemoryVaultEntry {
  id: string
  quote: string
  /** Given name of whoever said / captured it. */
  attribution: string
  role: string
  date: string
  /** 'sample' quotes are demo seed content; 'captured' ones were entered by the family. */
  source: 'sample' | 'captured'
}

export interface ConnectionOutput extends AgentResponseMeta {
  driftAlerts: ConnectionDriftAlert[]
  microActions: ConnectionMicroAction[]
  memoriesVault: MemoryVaultEntry[]
}

// ─── Caregiver Agent ──────────────────────────────────────────────────────────

export interface LoadMember {
  memberId: string
  memberName: string
  /** 0–100, from the single load model. */
  score: number
  /** Hours of invisible work in the next 7 days. */
  hours: number
  /** Percent of the family's total hours this member carries. */
  shareOfLoad: number
}

export interface AtRiskMember {
  memberId: string
  name: string
  score: number
  threshold: number
  pointsAbove: number
  daysWithoutRest: number
  hours: number
  shareOfLoad: number
  summary: string
}

/** A proposal to move one task to someone else. Never applied without the recipient's consent. */
export interface HandoffProposal {
  itemType: 'obligation' | 'medication' | 'event'
  itemId: string
  itemTitle: string
  fromId: string
  toId: string
  reason: string
  /** Hours per week the move takes off the sender. */
  hours: number
}

export interface CaregiverIntervention {
  description: string
  type: 'personal_time' | 'logistical_load' | 'medical_coordination'
  proposal?: HandoffProposal
}

export interface LoadBreakdownCategory {
  category: string
  /** Given name -> share (0-100) of this category's hours that member carries. */
  scores: Record<string, number>
}

export interface CaregiverOutput extends AgentResponseMeta {
  loadDistribution: LoadMember[]
  atRiskMember?: AtRiskMember
  /** Proposals only. Nothing here has been applied. */
  interventions: CaregiverIntervention[]
  proposals: HandoffProposal[]
  loadBreakdownByCategory: LoadBreakdownCategory[]
  totalHours: number
  baselineHours: number
  windowStart: string
}

// ─── Invisible Hours ──────────────────────────────────────────────────────────

export interface InvisibleHoursBreakdownEntry {
  hours: number
  taskCount: number
  description: string
}

export interface InvisibleHoursReport {
  totalHours: number
  /** The member carrying the most hours (the load model's top member). */
  primaryCaregiverId: string
  weekOf: string
  /** Keyed by LoadCategory (medical, school, admin, logistics, meals, social). */
  breakdown: Record<string, InvisibleHoursBreakdownEntry>
  comparisonToAverage: number
  /** Reference figure the comparison is made against (a planning assumption). */
  baselineHours: number
}

// ─── Member Briefing ──────────────────────────────────────────────────────────

export interface MemberBriefingInsight {
  text: string
  priority: number
  agent: AgentName
}

export interface MemberBriefing {
  memberId: string
  date: string
  greeting: string
  insights: MemberBriefingInsight[]
  /** Today's priority as one sentence. Always specific: see lib/briefing/rank.ts. */
  oneAction: string
  /** Structured form of oneAction for the consequence line and "Why?" popover. */
  priority?: TodayPriority | null
  /** Arabic rendering of the greeting and the priority, for read-aloud. Grandparent briefings only. */
  textAr?: string
  healthNudge?: string
  tone: 'authoritative' | 'supportive' | 'friendly' | 'simple'
}
