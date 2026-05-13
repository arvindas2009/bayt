import { subDays } from 'date-fns'
import type { Family, FamilyMember } from '@/types/family'
import type { InvisibleHoursReport } from '@/types/agents'

const MEDICAL_CATEGORIES = ['medical', 'caregiving']
const SCHOOL_CATEGORIES = ['education']
const LOGISTICS_CATEGORIES = ['chores', 'travel', 'family', 'extracurricular']
const BASELINE_HOURS = 4

function caregivingWeight(m: FamilyMember): number {
  return m.calendarEvents.filter((e) => {
    const cat = e.category.toLowerCase()
    return (
      MEDICAL_CATEGORIES.includes(cat) ||
      SCHOOL_CATEGORIES.includes(cat) ||
      LOGISTICS_CATEGORIES.includes(cat)
    )
  }).length
}

export function calculateInvisibleHours(family: Family): InvisibleHoursReport {
  const now = new Date()
  const weekStart = subDays(now, 7)
  const weekOf = weekStart.toISOString().split('T')[0]

  const recentEvents = family.members
    .flatMap((m) => m.calendarEvents)
    .filter((e) => {
      const d = new Date(e.date)
      return d >= weekStart && d <= now
    })

  // medical_admin: Medical or Caregiving category events (coordination/transport)
  const medicalAdminEvents = recentEvents.filter((e) =>
    MEDICAL_CATEGORIES.includes(e.category.toLowerCase()),
  )
  const medicalAdminHours = medicalAdminEvents.length * 0.25

  // conflict_resolution: any event flagged as conflicting
  const conflictEvents = recentEvents.filter((e) => e.conflict)
  const conflictHours = conflictEvents.length * 0.5

  // medication_management: weekly admin across all family meds
  const totalMeds = family.members.reduce((sum, m) => sum + m.medications.length, 0)
  const medicationHours = totalMeds * 0.1 * 7

  // school_admin: Education category events (communication overhead)
  const schoolEvents = recentEvents.filter((e) =>
    SCHOOL_CATEGORIES.includes(e.category.toLowerCase()),
  )
  const schoolAdminHours = schoolEvents.length * 0.2

  // logistics: household errands, travel, family activities
  const logisticsEvents = recentEvents.filter((e) =>
    LOGISTICS_CATEGORIES.includes(e.category.toLowerCase()),
  )
  const logisticsHours = logisticsEvents.length * 0.1

  const totalHours = parseFloat(
    (medicalAdminHours + conflictHours + medicationHours + schoolAdminHours + logisticsHours).toFixed(1),
  )

  // Primary caregiver: parent with highest engagement in caregiving-weighted events
  const parents = family.members.filter((m) => m.role === 'parent')
  const sorted = [...parents].sort((a, b) => caregivingWeight(b) - caregivingWeight(a))
  const primaryCaregiver = sorted[0] ?? family.members[0]

  const comparisonToAverage = Math.round(((totalHours - BASELINE_HOURS) / BASELINE_HOURS) * 100)

  return {
    totalHours,
    primaryCaregiverId: primaryCaregiver.id,
    weekOf,
    breakdown: {
      medical_admin: {
        hours: parseFloat(medicalAdminHours.toFixed(1)),
        taskCount: medicalAdminEvents.length,
        description: 'Medical appointment coordination & caregiving logistics',
      },
      school_admin: {
        hours: parseFloat(schoolAdminHours.toFixed(1)),
        taskCount: schoolEvents.length,
        description: 'School communication, pickup, and activity coordination',
      },
      logistics: {
        hours: parseFloat(logisticsHours.toFixed(1)),
        taskCount: logisticsEvents.length,
        description: 'Household errands, travel, and family logistics',
      },
      conflict_resolution: {
        hours: parseFloat(conflictHours.toFixed(1)),
        taskCount: conflictEvents.length,
        description: 'Resolving calendar conflicts and rescheduling',
      },
      medication_management: {
        hours: parseFloat(medicationHours.toFixed(1)),
        taskCount: totalMeds,
        description: 'Weekly medication tracking and administration across family',
      },
    },
    comparisonToAverage,
  }
}
