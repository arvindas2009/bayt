export interface RamadanPeriod {
  start: Date
  end: Date
  preRamadanAlert: Date
}

export interface AnnualSeason {
  start: string // MM-DD
  end: string   // MM-DD
}

export interface SchoolTerm {
  term: string
  start: Date
  end: Date
  examPeriodStart: Date
  examPeriodEnd: Date
}

export interface IslamicHoliday {
  name: 'Eid al-Fitr' | 'Eid al-Adha'
  date: Date
  uncertaintyDays: number // ±days: depends on moon sighting
}

/**
 * Dated table covering 2026–2027. Islamic dates are astronomical estimates and shift by up to
 * ±3 days with moon sighting, so each holiday carries its uncertainty. School terms follow the
 * published UAE Ministry of Education pattern and are APPROXIMATE: confirm against your school.
 * Add the next year's rows here; nothing else in the app needs to change.
 */

const d = (iso: string) => new Date(`${iso}T00:00:00`)

// Ramadan 1447 AH (2026) and 1448 AH (2027)
export const RAMADAN_PERIODS: RamadanPeriod[] = [
  { start: d('2026-02-18'), end: d('2026-03-19'), preRamadanAlert: d('2026-02-04') },
  { start: d('2027-02-08'), end: d('2027-03-09'), preRamadanAlert: d('2027-01-25') },
]

export const EID_HOLIDAYS: IslamicHoliday[] = [
  { name: 'Eid al-Fitr', date: d('2026-03-20'), uncertaintyDays: 3 },
  { name: 'Eid al-Adha', date: d('2026-05-27'), uncertaintyDays: 3 },
  { name: 'Eid al-Fitr', date: d('2027-03-10'), uncertaintyDays: 3 },
  { name: 'Eid al-Adha', date: d('2027-05-17'), uncertaintyDays: 3 },
]

// Annual Gulf dust season (Oct–Nov)
export const GULF_DUST_SEASON: AnnualSeason = {
  start: '10-01',
  end: '11-30',
}

// Annual Gulf summer heat advisory (Jun–mid Sep)
export const GULF_SUMMER_HEAT: AnnualSeason = {
  start: '06-01',
  end: '09-15',
}

// UAE school terms, academic years 2025-26 and 2026-27 (approximate)
export const UAE_SCHOOL_TERMS: SchoolTerm[] = [
  { term: 'Term 1', start: d('2025-08-28'), end: d('2025-12-19'), examPeriodStart: d('2025-12-07'), examPeriodEnd: d('2025-12-19') },
  { term: 'Term 2', start: d('2026-01-05'), end: d('2026-03-20'), examPeriodStart: d('2026-03-08'), examPeriodEnd: d('2026-03-20') },
  { term: 'Term 3', start: d('2026-04-06'), end: d('2026-06-30'), examPeriodStart: d('2026-06-15'), examPeriodEnd: d('2026-06-30') },
  { term: 'Term 1', start: d('2026-08-31'), end: d('2026-12-18'), examPeriodStart: d('2026-12-07'), examPeriodEnd: d('2026-12-18') },
  { term: 'Term 2', start: d('2027-01-04'), end: d('2027-03-26'), examPeriodStart: d('2027-03-15'), examPeriodEnd: d('2027-03-26') },
  { term: 'Term 3', start: d('2027-04-12'), end: d('2027-07-02'), examPeriodStart: d('2027-06-14'), examPeriodEnd: d('2027-07-02') },
]

// UAE National Day (Dec 2, annual)
export const GULF_NATIONAL_DAY = '12-02'

/** Last date the dated table above covers; used to warn when the calendar needs extending. */
export const CULTURAL_CALENDAR_COVERS_UNTIL = d('2027-12-31')
