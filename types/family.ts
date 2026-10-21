export type FamilyRole = 'parent' | 'child' | 'grandparent'

export interface MemberPreferences {
  foodLikes: string[]
  foodDislikes: string[]
  notes: string
}

export type LabResultStatus = 'normal' | 'monitor' | 'alert'

export interface LabResult {
  test: string
  value: string
  unit: string
  referenceRange: string
  status: LabResultStatus
  date: string
}

export interface WearableData {
  avgHeartRate: number
  sleepHours: number
  steps: number
  lastSync: string
}

export interface Medication {
  id: string
  memberId: string
  name: string
  dosage: string
  frequency: string
  interactions: string[]
  /** Who administers / refills it. Defaults to the patient when absent. */
  ownerId?: string
  /** Members able to cover if the owner cannot. */
  backupIds?: string[]
}

export interface HealthProfile {
  memberId: string
  conditions: string[]
  lastLabResults: LabResult[]
  wearableData: WearableData
  riskFlags: string[]
}

/** Lowercase on purpose: normalised at every data boundary (seed, insert, row parser). */
export type EventCategory =
  | 'education' | 'work' | 'health' | 'medical' | 'caregiving' | 'extracurricular'
  | 'social' | 'family' | 'travel' | 'chores' | 'personal'

export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface CalendarEvent {
  id: string
  memberId: string
  title: string
  date: string
  /** An EventCategory in practice; typed loosely because user-added events pass through here. */
  category: string
  conflict: boolean
  metadata?: string
  /** Who is responsible for making it happen. Defaults to memberId when absent. */
  ownerId?: string
  backupIds?: string[]
  recurrence?: Recurrence
}

export type ObligationCategory = 'Residency' | 'Finance' | 'School' | 'Health' | 'Home'

export interface Obligation {
  id: string
  familyId: string
  title: string
  category: ObligationCategory
  /** Key into lib/load/reference-durations. */
  taskType: string
  dueDate: string
  recurrence?: Recurrence
  ownerId: string
  backupIds: string[]
  /** Member the obligation concerns (whose Emirates ID, whose prescription). */
  subjectId?: string
  consequence: string
  leadTimeDays: number
  status: 'open' | 'done'
  sourceType?: string
  sourceId?: string
}

export type HandoffStatus = 'pending' | 'accepted' | 'declined' | 'redirected'
export type HandoffItemType = 'obligation' | 'medication' | 'event'

export interface Handoff {
  id: string
  familyId: string
  fromId: string
  toId: string
  itemType: HandoffItemType
  itemId: string
  itemTitle: string
  reason: string
  status: HandoffStatus
  redirectedToId?: string
  createdAt: string
  respondedAt?: string
}

export interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  age: number
  avatarSeed: string
  dietaryNeeds: string[]
  preferences?: MemberPreferences
  healthProfile?: HealthProfile
  medications: Medication[]
  calendarEvents: CalendarEvent[]
}

export interface Family {
  id: string
  /** Surname only (e.g. "Al-Mazrouei"). Members carry given names. */
  name: string
  members: FamilyMember[]
  obligations?: Obligation[]
  handoffs?: Handoff[]
}