export type AgentStatus = 'live' | 'preview' | 'idle' | 'thinking'

export type AgentName = 'operations' | 'health' | 'connection' | 'caregiver'

export interface AgentResponseMeta {
  _mock?: boolean
  _error?: string
}

export type InsightSeverity = 'info' | 'warning' | 'critical'

export interface BriefingInsight {
  id: string
  agent: AgentName
  severity: InsightSeverity
  text: string
  timestamp: string
}

export interface BriefingAlert {
  id: string
  severity: InsightSeverity
  text: string
  memberName: string
  memberId: string
  agent: AgentName
}

export interface CapturedMemory {
  quote: string
  attribution: string
  dateCaptured: string
}

export interface StressWindow {
  date: string
  risk: 'clear' | 'elevated' | 'high' | 'critical'
}

export interface DriftAlert {
  severity: 'critical' | 'moderate' | 'minor'
}

export interface MoodScoreInputs {
  healthOutput: HealthOutput
  caregiverLoad: number
  stressForecast: StressWindow[]
  driftAlerts: DriftAlert[]
  invisibleHours: InvisibleHoursReport
}

export interface MoodScore {
  composite: number
  trend: 'rising' | 'stable' | 'falling'
  components: {
    health: number
    relational: number
    operational: number
    caregiver: number
  }
  historicalScores: { date: string; score: number }[]
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
  moodScore?: MoodScore
}

export interface MealSummary {
  name: string
  tags: string[]
  calories: number
  suitableFor: string[]
}

export interface DayPlan {
  day: string
  breakfast: MealSummary
  lunch: MealSummary
  dinner: MealSummary
}

export interface CalendarConflict {
  members: string[]
  date: string
  conflict: string
  suggestion: string
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

export interface HealthTwinTrajectoryPoint {
  year: number
  riskScore: number
  dominantRisk: string
}

export interface HealthTwin {
  memberId: string
  currentTrajectory: HealthTwinTrajectoryPoint[]
  projectedTrajectory: HealthTwinTrajectoryPoint[]
  geneticRiskFactors: string[]
  interventionsApplied: string[]
  relatedAncestorId?: string
  relatedAncestorPattern?: string
}

export interface HealthOutput extends AgentResponseMeta {
  familyPatterns: FamilyPattern[]
  memberSummaries: MemberSummary[]
  crossLinks: CrossLink[]
  healthTwins?: HealthTwin[]
}

// ─── Connection Agent ─────────────────────────────────────────────────────────

export interface ConnectionDriftAlert {
  memberA: string
  memberB: string
  daysSinceContact: number
  severity: 'critical' | 'moderate' | 'minor'
  reason: string
  suggestion: string
}

export interface ConnectionMicroAction {
  day: string
  type: 'quick' | 'medium' | 'invest'
  description: string
  membersInvolved: string[]
}

export interface MemoryVaultEntry {
  quote: string
  attribution: string
  role: string
  date: string
}

export interface RepairStep {
  day: number
  type: 'memory_share' | 'activity_suggestion' | 'conversation_starter' | 'scheduled_moment'
  instruction: string
  estimatedMinutes: number
  completed: boolean
}

export interface RepairProtocol {
  id: string
  fromMemberId: string
  toMemberId: string
  driftDays: number
  driftCause: string
  sequence: RepairStep[]
  status: 'active' | 'completed' | 'paused'
  startedAt: string
}

export interface ConnectionOutput extends AgentResponseMeta {
  driftAlerts: ConnectionDriftAlert[]
  microActions: ConnectionMicroAction[]
  memoriesVault: MemoryVaultEntry[]
  repairProtocols: RepairProtocol[]
  syncScore: number
}

// ─── Caregiver Agent ──────────────────────────────────────────────────────────

export interface LoadMember {
  memberName: string
  score: number
}

export interface AtRiskMember {
  name: string
  score: number
  threshold: number
  pointsAbove: number
  daysWithoutRest: number
  summary: string
}

export interface CaregiverIntervention {
  description: string
  type: 'personal_time' | 'logistical_load' | 'medical_coordination'
}

export interface LoadBreakdownCategory {
  category: string
  scores: Record<string, number>
}

export interface CaregiverOutput extends AgentResponseMeta {
  loadDistribution: LoadMember[]
  atRiskMember?: AtRiskMember
  autoInterventions: CaregiverIntervention[]
  loadBreakdownByCategory: LoadBreakdownCategory[]
}

// ─── Invisible Hours ──────────────────────────────────────────────────────────

export interface InvisibleHoursBreakdownEntry {
  hours: number
  taskCount: number
  description: string
}

export interface InvisibleHoursReport {
  totalHours: number
  primaryCaregiverId: string
  weekOf: string
  breakdown: Record<string, InvisibleHoursBreakdownEntry>
  comparisonToAverage: number
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
  oneAction: string
  healthNudge?: string
  tone: 'authoritative' | 'supportive' | 'friendly' | 'simple'
}
