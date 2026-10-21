import { format } from 'date-fns'
import type { CalendarEvent, Family, HealthProfile, Medication, Obligation } from '@/types'
// Relative on purpose: this file also runs under `tsx` from the seed script.
import { at, atISO, getToday } from '../time/today'

/**
 * Demo family. Every date is generated relative to "today" so the app never looks stale.
 * Members carry given names only; the surname lives on the Family record.
 */

export const FAMILY_ID = 'fam_al_mazrouei'
export const FAMILY_SURNAME = 'Al-Mazrouei'

export const SALEM = 'mem_salem'
export const FATIMA = 'mem_fatima'
export const LAYLA = 'mem_layla'
export const KHALID = 'mem_khalid'
export const AISHA = 'mem_aisha'

// ── Medications (ownerId = who administers / refills; backupIds = who can cover) ──────────────

export const mockMedications: Medication[] = [
  {
    id: 'med_salem_1', memberId: SALEM, name: 'Metformin', dosage: '500mg', frequency: '2x daily',
    interactions: ['Alcohol', 'Certain blood pressure medications'],
    ownerId: SALEM, backupIds: [FATIMA],
  },
  {
    id: 'med_fatima_1', memberId: FATIMA, name: 'Ferrous Sulfate', dosage: '325mg', frequency: '1x daily',
    interactions: ['Antacids', 'Calcium supplements'],
    ownerId: FATIMA, backupIds: [SALEM],
  },
  {
    id: 'med_layla_1', memberId: LAYLA, name: 'Albuterol Inhaler', dosage: '90mcg/actuation', frequency: 'PRN (as needed)',
    interactions: ['Beta-blockers', 'Diuretics'],
    ownerId: FATIMA, backupIds: [SALEM],
  },
  {
    id: 'med_khalid_1', memberId: KHALID, name: 'Methylphenidate', dosage: '10mg', frequency: '1x morning',
    interactions: ['MAOIs', 'Antacids'],
    ownerId: FATIMA, backupIds: [SALEM],
  },
  {
    id: 'med_khalid_2', memberId: KHALID, name: 'Epinephrine auto-injector (EpiPen)', dosage: '0.3mg', frequency: 'PRN (emergency)',
    interactions: ['Beta-blockers'],
    ownerId: FATIMA, backupIds: [],
  },
  {
    id: 'med_aisha_1', memberId: AISHA, name: 'Alendronate', dosage: '70mg', frequency: '1x weekly',
    interactions: ['Calcium supplements', 'Antacids'],
    ownerId: FATIMA, backupIds: [], // weekly dose has a strict routine: only Fatima knows it
  },
  {
    id: 'med_aisha_2', memberId: AISHA, name: 'Lisinopril', dosage: '10mg', frequency: '1x daily',
    interactions: ['Potassium supplements', 'NSAIDs'],
    ownerId: FATIMA, backupIds: [LAYLA],
  },
]

// ── Health profiles ──────────────────────────────────────────────────────────────────────────

export const mockHealthProfiles: Record<string, HealthProfile> = {
  [SALEM]: {
    memberId: SALEM,
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    lastLabResults: [
      { test: 'HbA1c', value: '6.8', unit: '%', referenceRange: '< 5.7', status: 'monitor', date: atISO(-28, '08:00') },
      { test: 'Blood Pressure', value: '135/85', unit: 'mmHg', referenceRange: '< 120/80', status: 'monitor', date: atISO(-12, '09:00') },
    ],
    wearableData: { avgHeartRate: 72, sleepHours: 6.5, steps: 8500, lastSync: atISO(0, '07:30') },
    riskFlags: ['Slightly elevated BP trend', 'Missed evening Metformin once this week'],
  },
  [FATIMA]: {
    memberId: FATIMA,
    conditions: ['Iron Deficiency Anemia', 'Vitamin D Deficiency', 'Anxiety', 'Gluten Sensitivity'],
    lastLabResults: [
      { test: 'Ferritin', value: '18', unit: 'ng/mL', referenceRange: '15-150', status: 'alert', date: atISO(-60, '08:00') },
      { test: 'Vitamin D (25-OH)', value: '19', unit: 'ng/mL', referenceRange: '30-100', status: 'alert', date: atISO(-60, '08:00') },
    ],
    wearableData: { avgHeartRate: 76, sleepHours: 5.8, steps: 6200, lastSync: atISO(0, '06:15') },
    riskFlags: ['Sleep duration consistently under 6 hours', 'Shared Vit D deficiency with Layla'],
  },
  [LAYLA]: {
    memberId: LAYLA,
    conditions: ['Mild Asthma', 'Vitamin D Deficiency'],
    lastLabResults: [
      { test: 'Vitamin D (25-OH)', value: '22', unit: 'ng/mL', referenceRange: '30-100', status: 'alert', date: atISO(-45, '08:00') },
    ],
    wearableData: { avgHeartRate: 80, sleepHours: 6.0, steps: 10500, lastSync: atISO(0, '08:00') },
    riskFlags: ['High academic stress affecting sleep', 'Dust exposure can trigger asthma symptoms'],
  },
  [KHALID]: {
    memberId: KHALID,
    conditions: ['ADHD', 'Severe Nut Allergy'],
    lastLabResults: [
      { test: 'Height Percentile', value: '15', unit: '%', referenceRange: '10-90', status: 'monitor', date: atISO(-120, '09:00') },
      { test: 'Weight Percentile', value: '20', unit: '%', referenceRange: '10-90', status: 'normal', date: atISO(-120, '09:00') },
    ],
    wearableData: { avgHeartRate: 85, sleepHours: 9.0, steps: 14000, lastSync: atISO(0, '07:45') },
    riskFlags: [
      'Recent growth velocity slowing down',
      `EpiPen expires ${format(at(30), 'd MMM yyyy')}`,
    ],
  },
  [AISHA]: {
    memberId: AISHA,
    conditions: ['Osteoporosis', 'Hypertension', 'Mild Cognitive Decline'],
    lastLabResults: [
      { test: 'DEXA T-score', value: '-2.8', unit: '', referenceRange: '> -1.0', status: 'alert', date: atISO(-340, '10:00') },
      { test: 'Blood Pressure', value: '128/78', unit: 'mmHg', referenceRange: '< 130/80', status: 'normal', date: atISO(-14, '09:00') },
    ],
    wearableData: { avgHeartRate: 68, sleepHours: 7.5, steps: 3200, lastSync: atISO(0, '08:30') },
    riskFlags: ['Fall risk due to osteoporosis + steps pattern', 'Reported forgetting evening medication twice last month'],
  },
}

// ── Family ───────────────────────────────────────────────────────────────────────────────────

export const mockFamily: Family = {
  id: FAMILY_ID,
  name: FAMILY_SURNAME,
  members: [
    {
      id: SALEM, name: 'Salem', role: 'parent', age: 45, avatarSeed: 'salem',
      dietaryNeeds: ['Low-sodium', 'Low-glycemic'],
      preferences: { foodLikes: ['grilled fish', 'lentils', 'dates'], foodDislikes: ['sugary desserts'], notes: 'Watches carbs for diabetes' },
      healthProfile: mockHealthProfiles[SALEM],
      medications: mockMedications.filter((m) => m.memberId === SALEM),
      calendarEvents: [], // attached from mockCalendarEvents at seed time
    },
    {
      id: FATIMA, name: 'Fatima', role: 'parent', age: 42, avatarSeed: 'fatima',
      dietaryNeeds: ['Gluten-free'],
      preferences: { foodLikes: ['salads', 'rice dishes', 'fish'], foodDislikes: [], notes: 'Gluten sensitivity — no wheat, barley or regular bread' },
      healthProfile: mockHealthProfiles[FATIMA],
      medications: mockMedications.filter((m) => m.memberId === FATIMA),
      calendarEvents: [],
    },
    {
      id: LAYLA, name: 'Layla', role: 'child', age: 16, avatarSeed: 'layla',
      dietaryNeeds: ['Vegetarian'],
      preferences: { foodLikes: ['falafel', 'labneh', 'vegetable machboos'], foodDislikes: ['okra'], notes: 'No meat or fish; eggs and dairy are fine' },
      healthProfile: mockHealthProfiles[LAYLA],
      medications: mockMedications.filter((m) => m.memberId === LAYLA),
      calendarEvents: [],
    },
    {
      id: KHALID, name: 'Khalid', role: 'child', age: 12, avatarSeed: 'khalid',
      dietaryNeeds: ['Nut Allergy (Severe)'],
      preferences: { foodLikes: ['chicken kofta', 'rice', 'yoghurt'], foodDislikes: ['spicy food'], notes: 'Severe nut allergy — no nuts, peanuts or traces. Check sweets and sauces.' },
      healthProfile: mockHealthProfiles[KHALID],
      medications: mockMedications.filter((m) => m.memberId === KHALID),
      calendarEvents: [],
    },
    {
      id: AISHA, name: 'Aisha', role: 'grandparent', age: 71, avatarSeed: 'aisha',
      dietaryNeeds: ['Low-sodium', 'Soft foods'],
      preferences: { foodLikes: ['harees', 'lentil soup', 'balaleet'], foodDislikes: ['very spicy food'], notes: 'Soft textures; low salt for blood pressure' },
      healthProfile: mockHealthProfiles[AISHA],
      medications: mockMedications.filter((m) => m.memberId === AISHA),
      calendarEvents: [],
    },
  ],
}

// ── Calendar events ──────────────────────────────────────────────────────────────────────────

interface EvtOpts {
  conflict?: boolean
  metadata?: string
  ownerId?: string
  backupIds?: string[]
}

/**
 * A real week around "today". `ownerId` marks who is responsible for making an event happen
 * (driving, attending, covering) — the load model only counts events that have an owner.
 */
export function buildCalendarEvents(base: Date = getToday()): CalendarEvent[] {
  const evt = (
    id: string, memberId: string, title: string, offset: number, time: string, category: string, o: EvtOpts = {},
  ): CalendarEvent => ({
    id: `evt_${id}`,
    memberId,
    title,
    date: at(offset, time, base).toISOString(),
    category,
    conflict: o.conflict ?? false,
    ...(o.metadata ? { metadata: o.metadata } : {}),
    ...(o.ownerId ? { ownerId: o.ownerId } : {}),
    ...(o.backupIds ? { backupIds: o.backupIds } : {}),
  })

  const events: CalendarEvent[] = [
    // ── Past week ──
    evt('p1', LAYLA, 'Biology study group', -7, '15:00', 'education'),
    evt('p2', SALEM, 'Ministry strategy meeting', -6, '10:00', 'work'),
    evt('p3', FATIMA, 'Yoga class (Jumeirah)', -9, '17:00', 'personal'),
    evt('p4', KHALID, 'Football practice', -6, '16:30', 'extracurricular'),
    evt('p5', AISHA, 'Cardiology follow-up', -5, '09:30', 'medical', { ownerId: FATIMA, backupIds: [SALEM] }),
    evt('p6', SALEM, 'Dinner with brothers', -4, '20:00', 'social'),
    evt('p7', LAYLA, 'Mock exam: English', -3, '08:00', 'education', { ownerId: FATIMA, backupIds: [SALEM] }),
    evt('p8', AISHA, 'Afternoon tea with neighbours', -2, '16:00', 'social'),
    evt('p9', SALEM, 'Gym', -2, '06:30', 'personal'),
    // Layla was in exam week and missed the last family dinner; Salem last did something with her at her open day.
    evt('p10a', SALEM, 'Weekly family dinner', -9, '20:00', 'social'),
    evt('p10b', FATIMA, 'Weekly family dinner', -9, '20:00', 'social'),
    evt('p10c', KHALID, 'Weekly family dinner', -9, '20:00', 'social'),
    evt('p10d', AISHA, 'Weekly family dinner', -9, '20:00', 'social'),
    evt('p11', LAYLA, 'School open day', -16, '10:00', 'education', { ownerId: SALEM, backupIds: [FATIMA] }),

    // ── Today: clash #1 ──
    evt('t1', SALEM, 'Contractor site visit', 0, '13:00', 'work', { conflict: true, metadata: 'Requires Salem on site' }),
    evt('t2', KHALID, 'Parent–teacher conference', 0, '13:30', 'education', {
      conflict: true, metadata: 'Was assigned to Salem', ownerId: SALEM, backupIds: [FATIMA],
    }),
    evt('t3', FATIMA, 'Freelance design client call', 0, '11:00', 'work', { metadata: 'Ends 12:00' }),
    evt('t4', LAYLA, 'Maths tutoring', 0, '17:00', 'education'),

    // ── Upcoming ──
    evt('u1', AISHA, 'Physiotherapy: mobility', 2, '10:00', 'medical', {
      conflict: true, ownerId: FATIMA, backupIds: [], metadata: 'Fatima usually drives Aisha',
    }),
    evt('u2', FATIMA, 'Dentist appointment', 2, '10:00', 'medical', { conflict: true }),
    evt('u3', SALEM, 'Family majlis gathering', 2, '19:00', 'social'),
    evt('u4', LAYLA, 'Volunteering (Red Crescent)', 3, '09:00', 'extracurricular'),
    evt('u5', KHALID, 'Robotics workshop', 3, '14:00', 'education', { ownerId: SALEM, backupIds: [FATIMA] }),
    evt('u6', SALEM, 'Board meeting', 4, '09:00', 'work'),
    evt('u7', KHALID, 'Paediatrician follow-up (growth)', 4, '14:30', 'medical', { ownerId: FATIMA, backupIds: [SALEM] }),
    evt('u8', LAYLA, 'IB Physics mock exam', 5, '08:00', 'education'),
    evt('u9', AISHA, 'Neighbourhood Quran circle', 5, '16:00', 'social'),
    evt('u10', SALEM, 'Abu Dhabi site day', 6, '07:00', 'travel', { ownerId: FATIMA, backupIds: [], metadata: 'Salem away until evening; Fatima covers the household' }),
    evt('u11', LAYLA, 'Post-exam celebration', 7, '19:00', 'social', { conflict: true }),
    evt('u12', AISHA, 'Weekly family dinner', 7, '19:30', 'social', { conflict: true, metadata: 'Aisha expects everyone present' }),
    evt('u13', SALEM, 'Lab test (HbA1c)', 8, '08:00', 'health'),
    evt('u14', KHALID, 'School football finals', 9, '15:00', 'extracurricular'),
    evt('u15', SALEM, "Attend Khalid's final", 9, '15:00', 'family'),
    evt('u16', FATIMA, "Attend Khalid's final", 9, '15:00', 'family'),
    evt('u17', AISHA, 'Cardiology follow-up', 10, '09:30', 'medical', { ownerId: FATIMA, backupIds: [] }),
    evt('u18', LAYLA, 'Dentist check-up', 11, '16:00', 'medical', { ownerId: SALEM, backupIds: [FATIMA] }),
    evt('u19', FATIMA, 'Yoga class (Jumeirah)', 12, '17:00', 'personal'),
    evt('u20', SALEM, 'Padel with colleagues', 1, '19:00', 'personal'),
  ]

  // Khalid's school pickups on UAE weekdays: Fatima Mon/Wed/Fri, Salem Tue/Thu.
  for (let offset = -7; offset <= 14; offset++) {
    const day = at(offset, '14:30', base).getDay() // 0 Sun … 6 Sat; UAE weekend is Sat–Sun
    if (day === 0 || day === 6) continue
    const fatimaDay = day === 1 || day === 3 || day === 5
    events.push({
      id: `evt_pickup_${offset}`,
      memberId: KHALID,
      title: 'Khalid school pickup',
      date: at(offset, '14:30', base).toISOString(),
      category: 'family',
      conflict: false,
      ownerId: fatimaDay ? FATIMA : SALEM,
      backupIds: [fatimaDay ? SALEM : FATIMA],
      recurrence: 'weekly',
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export const mockCalendarEvents: CalendarEvent[] = buildCalendarEvents()

// ── Household obligations ────────────────────────────────────────────────────────────────────

/**
 * UAE-realistic recurring admin. Several are deliberately owned by one person with no backup so
 * Resilience Mode has real single points of failure to find.
 */
export function buildObligations(base: Date = getToday()): Obligation[] {
  const due = (offset: number) => at(offset, '12:00', base).toISOString()
  const o = (
    id: string,
    v: Omit<Obligation, 'id' | 'familyId' | 'status' | 'sourceType'>,
  ): Obligation => ({ id: `obl_${id}`, familyId: FAMILY_ID, status: 'open', sourceType: 'seed', ...v })

  return [
    // Residency
    o('visa_aisha', {
      title: "Renew Aisha's residence visa", category: 'Residency', taskType: 'renewal', dueDate: due(34),
      ownerId: SALEM, backupIds: [], subjectId: AISHA, leadTimeDays: 45,
      consequence: 'Visa lapses: overstay fines accrue daily and exit and re-entry become risky',
    }),
    o('eid_layla', {
      title: "Renew Layla's Emirates ID", category: 'Residency', taskType: 'renewal', dueDate: due(21),
      ownerId: FATIMA, backupIds: [SALEM], subjectId: LAYLA, leadTimeDays: 30,
      consequence: 'Late fee per day; school and health-insurance records cannot be updated',
    }),
    // Home
    o('ejari', {
      title: 'Renew tenancy contract (Ejari)', category: 'Home', taskType: 'renewal', dueDate: due(26),
      ownerId: SALEM, backupIds: [FATIMA], leadTimeDays: 30,
      consequence: 'Renewal window closes: the landlord can re-let or raise the rent, and DEWA is tied to Ejari',
    }),
    o('mulkiya', {
      title: 'Car registration (Mulkiya) renewal', category: 'Home', taskType: 'renewal', dueDate: due(17), recurrence: 'yearly',
      ownerId: SALEM, backupIds: [FATIMA], leadTimeDays: 21,
      consequence: 'Driving with expired registration: fine and the insurance claim can be refused',
    }),
    o('cooking', {
      title: 'Weekday family dinners', category: 'Home', taskType: 'meal_prep', dueDate: due(1), recurrence: 'daily',
      ownerId: FATIMA, backupIds: [SALEM], leadTimeDays: 1,
      consequence: 'Dinners fall back to delivery; the diet constraints are not met',
    }),
    o('meal_planning', {
      title: 'Plan the week’s meals and shopping list', category: 'Home', taskType: 'meal_planning', dueDate: due(2), recurrence: 'weekly',
      ownerId: FATIMA, backupIds: [], leadTimeDays: 2,
      consequence: 'Nobody knows what fits Layla, Khalid and Aisha: allergy and diet mistakes become likely',
    }),
    // Finance
    o('dewa', {
      title: 'Pay DEWA bill', category: 'Finance', taskType: 'bill', dueDate: due(6), recurrence: 'monthly',
      ownerId: SALEM, backupIds: [FATIMA], leadTimeDays: 5,
      consequence: 'Late fee, then a disconnection notice',
    }),
    o('salik', {
      title: 'Top up Salik', category: 'Finance', taskType: 'bill', dueDate: due(3), recurrence: 'monthly',
      ownerId: SALEM, backupIds: [FATIMA], leadTimeDays: 3,
      consequence: 'Each toll with no balance becomes a fine',
    }),
    o('insurance', {
      title: 'Renew family health insurance', category: 'Finance', taskType: 'renewal', dueDate: due(45), recurrence: 'yearly',
      ownerId: SALEM, backupIds: [FATIMA], leadTimeDays: 30,
      consequence: 'Coverage lapses: visa renewals and clinic visits are blocked',
    }),
    // School
    o('fees', {
      title: 'School fee instalment (Khalid and Layla)', category: 'School', taskType: 'fee_payment', dueDate: due(9), recurrence: 'quarterly',
      ownerId: FATIMA, backupIds: [], leadTimeDays: 7,
      consequence: 'Late fee, and report cards or exam entry can be withheld',
    }),
    o('allergy_form', {
      title: "Khalid's school allergy action plan", category: 'School', taskType: 'school_form', dueDate: due(5),
      ownerId: FATIMA, backupIds: [], subjectId: KHALID, leadTimeDays: 7,
      consequence: 'Khalid is not cleared for the canteen, sports or the school trip',
    }),
    // Health
    o('epipen', {
      title: "Replace Khalid's EpiPen (expires soon)", category: 'Health', taskType: 'refill', dueDate: due(30),
      ownerId: FATIMA, backupIds: [], subjectId: KHALID, leadTimeDays: 21,
      consequence: 'No in-date rescue epinephrine for a child with a severe nut allergy',
    }),
    o('inhaler', {
      title: "Refill Layla's inhaler", category: 'Health', taskType: 'refill', dueDate: due(8), recurrence: 'monthly',
      ownerId: FATIMA, backupIds: [], subjectId: LAYLA, leadTimeDays: 7,
      consequence: 'No reliever inhaler during dust season',
    }),
  ]
}

export const mockObligations: Obligation[] = buildObligations()

// ── Memory Vault samples ─────────────────────────────────────────────────────────────────────

export interface MemorySeed {
  id: string
  quote: string
  attribution: string // member id
  role: string
  capturedAt: string
}

export function buildMemories(base: Date = getToday()): MemorySeed[] {
  const m = (id: string, attribution: string, role: string, offset: number, quote: string): MemorySeed => ({
    id: `memo_${id}`, attribution, role, quote, capturedAt: at(offset, '20:00', base).toISOString(),
  })
  return [
    m('1', AISHA, 'Grandmother', -9, 'The smell of cardamom in the morning is the smell of home.'),
    m('2', SALEM, 'Father', -6, 'Patience is not waiting. It is knowing what you are waiting for.'),
    m('3', FATIMA, 'Mother', -18, 'Cooking for someone is the most direct way to say I love you.'),
    m('4', LAYLA, 'Daughter', -4, 'Teta says stars are the eyes of people who loved us first.'),
    m('5', KHALID, 'Son', -2, 'My first real audience was Baba. He always laughed even when the joke was bad.'),
    m('6', AISHA, 'Grandmother', -23, 'There were no shortcuts with her. Everything was done properly or not at all.'),
  ]
}

export const mockMemories: MemorySeed[] = buildMemories()
