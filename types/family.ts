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
}

export interface HealthProfile {
  memberId: string
  conditions: string[]
  lastLabResults: LabResult[]
  wearableData: WearableData
  riskFlags: string[]
}

export interface CalendarEvent {
  id: string
  memberId: string
  title: string
  date: string
  category: string
  conflict: boolean
  metadata?: string
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
  name: string
  members: FamilyMember[]
}