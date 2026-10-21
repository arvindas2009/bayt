import type { FamilyMember } from '@/types'

export type HealthStatus = 'good' | 'monitor' | 'alert'

export const STATUS_WORD: Record<HealthStatus, string> = {
  good: 'Nothing to flag',
  monitor: 'Keep an eye on',
  alert: 'Needs attention',
}

/** From the latest labs and risk flags, so the word never depends on a model. */
export function statusOf(m: FamilyMember): HealthStatus {
  const labs = m.healthProfile?.lastLabResults ?? []
  if (labs.some((l) => l.status === 'alert')) return 'alert'
  if (labs.some((l) => l.status === 'monitor') || (m.healthProfile?.riskFlags.length ?? 0) > 0) return 'monitor'
  return 'good'
}
