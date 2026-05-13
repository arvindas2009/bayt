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
  date: Date
  uncertaintyDays: number // ±days
}

// Ramadan 1447 AH — astronomical new moon approx. Feb 18, 2026
export const RAMADAN_2026: RamadanPeriod = {
  start: new Date('2026-02-18'),
  end: new Date('2026-03-19'),
  preRamadanAlert: new Date('2026-02-04'), // 2 weeks before start
}

// Annual Gulf dust season (Shamal winds, Oct–Nov)
export const GULF_DUST_SEASON: AnnualSeason = {
  start: '10-01',
  end: '11-30',
}

// Annual Gulf summer heat advisory (Jun–mid Sep)
export const GULF_SUMMER_HEAT: AnnualSeason = {
  start: '06-01',
  end: '09-15',
}

// UAE ADEC/MOE school terms 2025-2026
export const UAE_SCHOOL_TERMS: SchoolTerm[] = [
  {
    term: 'Term 1',
    start: new Date('2025-08-28'),
    end: new Date('2025-12-19'),
    examPeriodStart: new Date('2025-12-07'),
    examPeriodEnd: new Date('2025-12-19'),
  },
  {
    term: 'Term 2',
    start: new Date('2026-01-05'),
    end: new Date('2026-03-20'),
    examPeriodStart: new Date('2026-03-08'),
    examPeriodEnd: new Date('2026-03-20'),
  },
  {
    term: 'Term 3',
    start: new Date('2026-04-06'),
    end: new Date('2026-06-30'),
    examPeriodStart: new Date('2026-06-15'),
    examPeriodEnd: new Date('2026-06-30'),
  },
]

// UAE National Day (Dec 2, annual)
export const GULF_NATIONAL_DAY = '12-02'

// Eid al-Fitr 1447 AH — approx. Mar 20, 2026 (±3 days moon sighting)
export const EID_AL_FITR_2026: IslamicHoliday = {
  date: new Date('2026-03-20'),
  uncertaintyDays: 3,
}

// Eid al-Adha 1447 AH — approx. May 27, 2026 (±3 days moon sighting)
export const EID_AL_ADHA_2026: IslamicHoliday = {
  date: new Date('2026-05-27'),
  uncertaintyDays: 3,
}
