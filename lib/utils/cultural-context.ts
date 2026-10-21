import {
  RAMADAN_PERIODS,
  EID_HOLIDAYS,
  GULF_DUST_SEASON,
  GULF_SUMMER_HEAT,
  UAE_SCHOOL_TERMS,
  GULF_NATIONAL_DAY,
  CULTURAL_CALENDAR_COVERS_UNTIL,
  type AnnualSeason,
} from '@/lib/data/cultural-calendar'
import type { FamilyMember } from '@/types/family'

export type ActiveSeason =
  | 'ramadan'
  | 'dust_season'
  | 'summer_heat'
  | 'exam_period'
  | 'school_holiday'

export type MealPlanningMode = 'standard' | 'ramadan' | 'iftar_focus' | 'suhoor_focus'
export type ImpactLevel = 'low' | 'medium' | 'high'
export type SocialObligationLevel = 'low' | 'medium' | 'high'

export interface UpcomingEvent {
  name: string
  daysUntil: number
  impactLevel: ImpactLevel
}

export interface CulturalContext {
  activeSeasons: ActiveSeason[]
  upcomingEvents: UpcomingEvent[]
  mealPlanningMode: MealPlanningMode
  healthAlertOverrides: string[]
  socialObligationLevel: SocialObligationLevel
  /** Given names of members with a respiratory condition, read from member data (never hard-coded). */
  respiratoryMemberNames: string[]
  /** False when the date is past the dated table, so Ramadan/Eid/term data is missing. */
  calendarCovered: boolean
}

type MemberLike = Pick<FamilyMember, 'name' | 'healthProfile'>

const RESPIRATORY = /asthma|copd|respiratory|bronch/i

export function respiratoryMembers(members: MemberLike[] = []): string[] {
  return members
    .filter((m) => m.healthProfile?.conditions.some((c) => RESPIRATORY.test(c)))
    .map((m) => m.name)
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

function msTodays(ms: number): number {
  return Math.round(ms / 86400000)
}

function isInAnnualSeason(date: Date, season: AnnualSeason): boolean {
  const [sm, sd] = season.start.split('-').map(Number)
  const [em, ed] = season.end.split('-').map(Number)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dateNum = month * 100 + day
  const startNum = sm * 100 + sd
  const endNum = em * 100 + ed
  // All Gulf seasons used here don't wrap the year boundary
  return dateNum >= startNum && dateNum <= endNum
}

export function getCulturalContext(date: Date, members: MemberLike[] = []): CulturalContext {
  const activeSeasons: ActiveSeason[] = []
  const upcomingEvents: UpcomingEvent[] = []
  const healthAlertOverrides: string[] = []
  const respiratoryMemberNames = respiratoryMembers(members)

  // ── Ramadan ──────────────────────────────────────────────────────────────────
  const currentRamadan = RAMADAN_PERIODS.find((r) => date >= r.start && date <= r.end)
  const isRamadan = Boolean(currentRamadan)
  const nextRamadan = RAMADAN_PERIODS.find((r) => r.start > date)
  const isPreRamadanAlert = Boolean(nextRamadan && date >= nextRamadan.preRamadanAlert)

  if (isRamadan) {
    activeSeasons.push('ramadan')
  } else if (nextRamadan) {
    const daysToRamadan = msTodays(nextRamadan.start.getTime() - date.getTime())
    if (daysToRamadan > 0 && daysToRamadan <= 30) {
      upcomingEvents.push({ name: 'Ramadan', daysUntil: daysToRamadan, impactLevel: 'high' })
    }
  }

  // ── Eids (each holiday is a ±uncertainty window) ─────────────────────────────
  let inEidWindow = false
  let eidWithinWeek = false
  for (const eid of EID_HOLIDAYS) {
    const daysTo = msTodays(eid.date.getTime() - date.getTime())
    if (daysTo >= 0 && daysTo <= 14) {
      upcomingEvents.push({
        name: `${eid.name} (±${eid.uncertaintyDays}d)`,
        daysUntil: daysTo,
        impactLevel: 'high',
      })
    }
    if (daysTo >= -(eid.uncertaintyDays + 3) && daysTo <= eid.uncertaintyDays + 3) inEidWindow = true
    if (daysTo >= 0 && daysTo <= 7) eidWithinWeek = true
  }

  // ── Gulf Dust Season ─────────────────────────────────────────────────────────
  if (isInAnnualSeason(date, GULF_DUST_SEASON)) {
    activeSeasons.push('dust_season')
    healthAlertOverrides.push(
      respiratoryMemberNames.length > 0
        ? `Dust season: respiratory sensitivity for ${joinNames(respiratoryMemberNames)}. Avoid outdoor PE and keep reliever medication within reach.`
        : 'Dust season: limit outdoor activity on high-dust days for anyone with respiratory sensitivity.'
    )
  }

  // ── Gulf Summer Heat ─────────────────────────────────────────────────────────
  if (isInAnnualSeason(date, GULF_SUMMER_HEAT)) {
    activeSeasons.push('summer_heat')
    healthAlertOverrides.push(
      'Summer heat advisory: hydration critical for all members. Restrict outdoor activity to before 10am and after 5pm.'
    )
  }

  // ── UAE School Terms ─────────────────────────────────────────────────────────
  let inSchoolTerm = false
  for (const term of UAE_SCHOOL_TERMS) {
    if (date >= term.start && date <= term.end) {
      inSchoolTerm = true
      if (date >= term.examPeriodStart && date <= term.examPeriodEnd) {
        activeSeasons.push('exam_period')
      }
      break
    }
  }
  if (!inSchoolTerm) {
    const firstTermStart = UAE_SCHOOL_TERMS[0].start
    const lastTermEnd = UAE_SCHOOL_TERMS[UAE_SCHOOL_TERMS.length - 1].end
    if (date >= firstTermStart && date <= lastTermEnd) {
      activeSeasons.push('school_holiday')
    }
  }

  // Upcoming exams within 14 days
  for (const term of UAE_SCHOOL_TERMS) {
    const d = msTodays(term.examPeriodStart.getTime() - date.getTime())
    if (d > 0 && d <= 14) {
      upcomingEvents.push({ name: `${term.term} Exams`, daysUntil: d, impactLevel: 'high' })
    }
  }

  // ── UAE National Day ─────────────────────────────────────────────────────────
  const [ndMonth, ndDay] = GULF_NATIONAL_DAY.split('-').map(Number)
  const nationalDay = new Date(date.getFullYear(), ndMonth - 1, ndDay)
  const daysToNationalDay = msTodays(nationalDay.getTime() - date.getTime())
  if (daysToNationalDay >= 0 && daysToNationalDay <= 14) {
    upcomingEvents.push({ name: 'UAE National Day', daysUntil: daysToNationalDay, impactLevel: 'medium' })
  }

  // ── Meal planning mode ───────────────────────────────────────────────────────
  let mealPlanningMode: MealPlanningMode = 'standard'
  if (isRamadan) {
    const hour = date.getHours()
    mealPlanningMode = hour >= 3 && hour < 6 ? 'suhoor_focus' : 'iftar_focus'
  } else if (isPreRamadanAlert) {
    mealPlanningMode = 'ramadan'
  }

  // ── Social obligation level ──────────────────────────────────────────────────
  let socialObligationLevel: SocialObligationLevel = 'low'
  if (isRamadan || inEidWindow) {
    socialObligationLevel = 'high'
  } else if (eidWithinWeek || (daysToNationalDay >= 0 && daysToNationalDay <= 7)) {
    socialObligationLevel = 'medium'
  }

  upcomingEvents.sort((a, b) => a.daysUntil - b.daysUntil)

  return {
    activeSeasons,
    upcomingEvents,
    mealPlanningMode,
    healthAlertOverrides,
    socialObligationLevel,
    respiratoryMemberNames,
    calendarCovered: date <= CULTURAL_CALENDAR_COVERS_UNTIL,
  }
}

export function formatCulturalContextBlock(ctx: CulturalContext): string {
  const lines: string[] = [
    '=== CURRENT CULTURAL CONTEXT ===',
    `Active seasons: ${ctx.activeSeasons.join(', ') || 'none'}`,
    `Meal planning mode: ${ctx.mealPlanningMode}`,
    `Social obligation level: ${ctx.socialObligationLevel}`,
  ]

  if (ctx.upcomingEvents.length > 0) {
    lines.push(
      'Upcoming events:',
      ...ctx.upcomingEvents.map(
        (e) => `  • ${e.name} in ${e.daysUntil} day${e.daysUntil === 1 ? '' : 's'} [${e.impactLevel} impact]`
      )
    )
  }

  if (ctx.healthAlertOverrides.length > 0) {
    lines.push('Health alert overrides:', ...ctx.healthAlertOverrides.map((a) => `  • ${a}`))
  }

  lines.push('Adjust all agent outputs accordingly.', '=================================')

  return lines.join('\n')
}

export function getCulturalModeLabel(ctx: CulturalContext): string | null {
  if (ctx.mealPlanningMode === 'iftar_focus' || ctx.mealPlanningMode === 'suhoor_focus' || ctx.mealPlanningMode === 'ramadan') {
    return 'Ramadan Mode'
  }
  if (ctx.activeSeasons.includes('dust_season')) return 'Dust Season'
  if (ctx.activeSeasons.includes('summer_heat')) return 'Summer Heat'
  if (ctx.activeSeasons.includes('exam_period')) return 'Exam Period'
  return null
}

export function getCulturalModeTooltip(ctx: CulturalContext): string {
  const parts: string[] = []

  if (ctx.mealPlanningMode !== 'standard') {
    parts.push(
      ctx.mealPlanningMode === 'ramadan'
        ? 'Ramadan starts soon — meal plans are being prepared for suhoor and iftar schedules.'
        : 'Meal plans show Suhoor and Iftar meals. Breakfast/lunch fields reflect pre-dawn and sunset meals.'
    )
  }
  if (ctx.activeSeasons.includes('dust_season')) {
    parts.push(
      ctx.respiratoryMemberNames.length > 0
        ? `Dust season active — respiratory precautions raised for ${joinNames(ctx.respiratoryMemberNames)}.`
        : 'Dust season active — outdoor precautions advised.'
    )
  }
  if (ctx.activeSeasons.includes('summer_heat')) {
    parts.push('Summer heat advisory — outdoor activity recommendations restricted.')
  }
  if (ctx.activeSeasons.includes('exam_period')) {
    parts.push('Exam period — school stress flags added to caregiver load estimates.')
  }
  if (ctx.socialObligationLevel === 'high') {
    parts.push('High social obligation period — family connection drift alerts are suppressed.')
  }

  return parts.join(' ') || 'Cultural calendar awareness is active.'
}
