import { format } from 'date-fns'
import type { Family } from '@/types/family'
import type { InvisibleHoursReport } from '@/types/agents'
import { computeLoad, type LoadReport } from '@/lib/load/model'
import { BASELINE_WEEKLY_HOURS, LOAD_CATEGORY_LABELS, type LoadCategory } from '@/lib/load/reference-durations'
import { getToday } from '@/lib/time/today'

const CATEGORY_DESCRIPTION: Record<LoadCategory, string> = {
  medical: 'Appointments, escorts, refills and giving medication to others',
  school: 'School runs, meetings, forms and fee payments',
  admin: 'Residency renewals, tenancy, insurance and other paperwork',
  logistics: 'Errands, covering for travel and resolving clashes',
  meals: 'Planning the week around every diet, and cooking',
  social: 'Hosting and family obligations',
}

/** A view over the single load model, shaped for the Invisible Hours cards. */
export function invisibleHoursFromLoad(load: LoadReport): InvisibleHoursReport {
  const breakdown: InvisibleHoursReport['breakdown'] = {}
  for (const category of Object.keys(LOAD_CATEGORY_LABELS) as LoadCategory[]) {
    const items = load.items.filter((i) => i.category === category)
    const hours = items.reduce((sum, i) => sum + i.hours, 0)
    if (items.length === 0) continue
    breakdown[category] = {
      hours: Math.round(hours * 10) / 10,
      taskCount: items.length,
      description: CATEGORY_DESCRIPTION[category],
    }
  }

  return {
    totalHours: load.totalHours,
    primaryCaregiverId: load.topMemberId ?? '',
    weekOf: format(new Date(load.windowStart), 'yyyy-MM-dd'),
    breakdown,
    comparisonToAverage: load.comparisonToAverage,
    baselineHours: BASELINE_WEEKLY_HOURS,
  }
}

export function calculateInvisibleHours(family: Family, today: Date = getToday()): InvisibleHoursReport {
  return invisibleHoursFromLoad(computeLoad(family, today))
}
