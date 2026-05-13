import type { Family, HealthProfile, Medication, CalendarEvent } from '@/types'

export const mockMedications: Medication[] = [
  {
    id: 'med_salem_1',
    memberId: 'mem_salem',
    name: 'Metformin',
    dosage: '500mg',
    frequency: '2x daily',
    interactions: ['Alcohol', 'Certain blood pressure medications'],
  },
  {
    id: 'med_fatima_1',
    memberId: 'mem_fatima',
    name: 'Ferrous Sulfate',
    dosage: '325mg',
    frequency: '1x daily',
    interactions: ['Antacids', 'Calcium supplements'],
  },
  {
    id: 'med_layla_1',
    memberId: 'mem_layla',
    name: 'Albuterol Inhaler',
    dosage: '90mcg/actuation',
    frequency: 'PRN (as needed)',
    interactions: ['Beta-blockers', 'Diuretics'],
  },
  {
    id: 'med_khalid_1',
    memberId: 'mem_khalid',
    name: 'Methylphenidate',
    dosage: '10mg',
    frequency: '1x morning',
    interactions: ['MAOIs', 'Antacids', 'Nut Allergy (check formulations for peanut oil carriers)'],
  },
  {
    id: 'med_aisha_1',
    memberId: 'mem_aisha',
    name: 'Alendronate',
    dosage: '70mg',
    frequency: '1x weekly',
    interactions: ['Calcium supplements', 'Antacids'],
  },
  {
    id: 'med_aisha_2',
    memberId: 'mem_aisha',
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: '1x daily',
    interactions: ['Potassium supplements', 'NSAIDs'],
  },
]

export const mockHealthProfiles: Record<string, HealthProfile> = {
  mem_salem: {
    memberId: 'mem_salem',
    conditions: ['Type 2 Diabetes', 'Hypertension'],
    lastLabResults: [
      { test: 'HbA1c', value: '6.8', unit: '%', referenceRange: '< 5.7', status: 'monitor', date: '2026-04-15T08:00:00Z' },
      { test: 'Blood Pressure', value: '135/85', unit: 'mmHg', referenceRange: '< 120/80', status: 'monitor', date: '2026-05-01T09:00:00Z' },
    ],
    wearableData: { avgHeartRate: 72, sleepHours: 6.5, steps: 8500, lastSync: '2026-05-08T07:30:00Z' },
    riskFlags: ['Slightly elevated BP trend', 'Missed evening Metformin once this week'],
  },
  mem_fatima: {
    memberId: 'mem_fatima',
    conditions: ['Iron Deficiency Anemia', 'Vitamin D Deficiency', 'Anxiety', 'Gluten Sensitivity'],
    lastLabResults: [
      { test: 'Ferritin', value: '18', unit: 'ng/mL', referenceRange: '15-150', status: 'alert', date: '2026-03-20T08:00:00Z' },
      { test: 'Vitamin D (25-OH)', value: '19', unit: 'ng/mL', referenceRange: '30-100', status: 'alert', date: '2026-03-20T08:00:00Z' },
    ],
    wearableData: { avgHeartRate: 76, sleepHours: 5.8, steps: 6200, lastSync: '2026-05-08T06:15:00Z' },
    riskFlags: ['Sleep duration consistently under 6 hours', 'Shared Vit D deficiency with Layla'],
  },
  mem_layla: {
    memberId: 'mem_layla',
    conditions: ['Mild Asthma', 'Vitamin D Deficiency'],
    lastLabResults: [
      { test: 'Vitamin D (25-OH)', value: '22', unit: 'ng/mL', referenceRange: '30-100', status: 'alert', date: '2026-04-10T08:00:00Z' },
    ],
    wearableData: { avgHeartRate: 80, sleepHours: 6.0, steps: 10500, lastSync: '2026-05-08T08:00:00Z' },
    riskFlags: ['High academic stress affecting sleep', 'Potential exacerbation of asthma due to spring allergies'],
  },
  mem_khalid: {
    memberId: 'mem_khalid',
    conditions: ['ADHD', 'Severe Nut Allergy'],
    lastLabResults: [
      { test: 'Height Percentile', value: '15', unit: '%', referenceRange: '10-90', status: 'monitor', date: '2026-02-14T09:00:00Z' },
      { test: 'Weight Percentile', value: '20', unit: '%', referenceRange: '10-90', status: 'normal', date: '2026-02-14T09:00:00Z' },
    ],
    wearableData: { avgHeartRate: 85, sleepHours: 9.0, steps: 14000, lastSync: '2026-05-08T07:45:00Z' },
    riskFlags: ['Recent growth velocity slowing down', 'EpiPen expiration approaching (June 2026)'],
  },
  mem_aisha: {
    memberId: 'mem_aisha',
    conditions: ['Osteoporosis', 'Hypertension', 'Mild Cognitive Decline'],
    lastLabResults: [
      { test: 'DEXA T-score', value: '-2.8', unit: '', referenceRange: '> -1.0', status: 'alert', date: '2025-11-10T10:00:00Z' },
      { test: 'Blood Pressure', value: '128/78', unit: 'mmHg', referenceRange: '< 130/80', status: 'normal', date: '2026-04-28T09:00:00Z' },
    ],
    wearableData: { avgHeartRate: 68, sleepHours: 7.5, steps: 3200, lastSync: '2026-05-08T08:30:00Z' },
    riskFlags: ['Fall risk due to osteoporosis + steps pattern', 'Reported forgetting evening medication twice last month'],
  },
}

export const mockFamily: Family = {
  id: 'fam_al_salem',
  name: 'Al-Salem',
  members: [
    {
      id: 'mem_salem',
      name: 'Salem Al-Mazrouei',
      role: 'parent',
      age: 45,
      avatarSeed: 'salem',
      dietaryNeeds: ['Low-sodium', 'Low-glycemic'],
      healthProfile: mockHealthProfiles['mem_salem'],
      medications: mockMedications.filter(m => m.memberId === 'mem_salem'),
    },
    {
      id: 'mem_fatima',
      name: 'Fatima Al-Mazrouei',
      role: 'parent',
      age: 42,
      avatarSeed: 'fatima',
      dietaryNeeds: ['Gluten-free'],
      healthProfile: mockHealthProfiles['mem_fatima'],
      medications: mockMedications.filter(m => m.memberId === 'mem_fatima'),
    },
    {
      id: 'mem_layla',
      name: 'Layla Al-Mazrouei',
      role: 'child',
      age: 16,
      avatarSeed: 'layla',
      dietaryNeeds: ['Vegetarian'],
      healthProfile: mockHealthProfiles['mem_layla'],
      medications: mockMedications.filter(m => m.memberId === 'mem_layla'),
    },
    {
      id: 'mem_khalid',
      name: 'Khalid Al-Mazrouei',
      role: 'child',
      age: 12,
      avatarSeed: 'khalid',
      dietaryNeeds: ['Nut Allergy (Severe)'],
      healthProfile: mockHealthProfiles['mem_khalid'],
      medications: mockMedications.filter(m => m.memberId === 'mem_khalid'),
    },
    {
      id: 'mem_aisha',
      name: 'Aisha Al-Mazrouei',
      role: 'grandparent',
      age: 71,
      avatarSeed: 'aisha',
      dietaryNeeds: ['Low-sodium', 'Soft foods'],
      healthProfile: mockHealthProfiles['mem_aisha'],
      medications: mockMedications.filter(m => m.memberId === 'mem_aisha'),
    },
  ],
}

export const mockCalendarEvents: CalendarEvent[] = [
  // -- Past Week (May 1 - May 7)
  { id: 'evt_1', memberId: 'mem_layla', title: 'Biology Study Group', date: '2026-05-01T15:00:00Z', category: 'Education', conflict: false },
  { id: 'evt_2', memberId: 'mem_salem', title: 'Ministry Strategy Meeting', date: '2026-05-02T10:00:00Z', category: 'Work', conflict: false },
  { id: 'evt_3', memberId: 'mem_fatima', title: 'Yoga Class (Jumeirah)', date: '2026-05-02T17:00:00Z', category: 'Health', conflict: false },
  { id: 'evt_4', memberId: 'mem_khalid', title: 'Football Practice', date: '2026-05-03T16:30:00Z', category: 'Extracurricular', conflict: false },
  { id: 'evt_5', memberId: 'mem_aisha', title: 'Cardiologist Follow-up', date: '2026-05-04T09:30:00Z', category: 'Medical', conflict: false },
  { id: 'evt_6', memberId: 'mem_fatima', title: 'Drive Aisha to Cardiologist', date: '2026-05-04T09:00:00Z', category: 'Caregiving', conflict: false },
  { id: 'evt_7', memberId: 'mem_salem', title: 'Dinner with Brothers', date: '2026-05-05T20:00:00Z', category: 'Social', conflict: false },
  { id: 'evt_8', memberId: 'mem_layla', title: 'Mock Exams - English', date: '2026-05-06T08:00:00Z', category: 'Education', conflict: false },
  { id: 'evt_9', memberId: 'mem_khalid', title: 'Football Match', date: '2026-05-06T15:00:00Z', category: 'Extracurricular', conflict: false },
  { id: 'evt_10', memberId: 'mem_aisha', title: 'Afternoon Tea with Neighbors', date: '2026-05-07T16:00:00Z', category: 'Social', conflict: false },

  // -- Today / Conflict 1 (May 8)
  { id: 'evt_11', memberId: 'mem_salem', title: 'Regional Contractor Visit', date: '2026-05-08T13:00:00Z', category: 'Work', conflict: true, metadata: 'Requires Salem on-site' },
  { id: 'evt_12', memberId: 'mem_khalid', title: 'Parent-Teacher Conference', date: '2026-05-08T13:30:00Z', category: 'Education', conflict: true, metadata: 'Was assigned to Salem' },
  { id: 'evt_13', memberId: 'mem_fatima', title: 'Freelance Design Client Call', date: '2026-05-08T11:00:00Z', category: 'Work', conflict: false },
  { id: 'evt_14', memberId: 'mem_layla', title: 'Math Tutoring', date: '2026-05-08T17:00:00Z', category: 'Education', conflict: false },

  // -- Next Weekend (May 9 - 10)
  { id: 'evt_15', memberId: 'mem_aisha', title: 'Physiotherapy - Mobility', date: '2026-05-09T10:00:00Z', category: 'Medical', conflict: true },
  { id: 'evt_16', memberId: 'mem_fatima', title: 'Dentist Appointment', date: '2026-05-09T10:00:00Z', category: 'Medical', conflict: true, metadata: 'Fatima usually drives Aisha' },
  { id: 'evt_17', memberId: 'mem_salem', title: 'Family Majlis Gathering', date: '2026-05-09T19:00:00Z', category: 'Social', conflict: false },
  { id: 'evt_18', memberId: 'mem_layla', title: 'Volunteer Work (Red Crescent)', date: '2026-05-10T09:00:00Z', category: 'Extracurricular', conflict: false },
  { id: 'evt_19', memberId: 'mem_khalid', title: 'Robotics Workshop', date: '2026-05-10T14:00:00Z', category: 'Education', conflict: false },
  
  // -- Mid-May (May 11 - 15)
  { id: 'evt_20', memberId: 'mem_salem', title: 'Board Meeting', date: '2026-05-11T09:00:00Z', category: 'Work', conflict: false },
  { id: 'evt_21', memberId: 'mem_khalid', title: 'Pediatrician Follow-up (Growth)', date: '2026-05-11T14:30:00Z', category: 'Medical', conflict: false },
  { id: 'evt_22', memberId: 'mem_fatima', title: 'Take Khalid to Clinic', date: '2026-05-11T14:00:00Z', category: 'Caregiving', conflict: false },
  { id: 'evt_23', memberId: 'mem_layla', title: 'IB Physics Exam', date: '2026-05-12T08:00:00Z', category: 'Education', conflict: false },
  { id: 'evt_24', memberId: 'mem_aisha', title: 'Neighborhood Quran Circle', date: '2026-05-12T16:00:00Z', category: 'Social', conflict: false },
  { id: 'evt_25', memberId: 'mem_salem', title: 'Abu Dhabi Commute', date: '2026-05-13T07:00:00Z', category: 'Travel', conflict: false },
  { id: 'evt_26', memberId: 'mem_fatima', title: 'Grocery Run (Organic/GF)', date: '2026-05-13T10:00:00Z', category: 'Chores', conflict: false },
  
  // -- Conflict 3
  { id: 'evt_27', memberId: 'mem_layla', title: 'Post-Exam Celebration', date: '2026-05-14T19:00:00Z', category: 'Social', conflict: true },
  { id: 'evt_28', memberId: 'mem_aisha', title: 'Weekly Family Dinner (Mandatory)', date: '2026-05-14T19:30:00Z', category: 'Social', conflict: true, metadata: 'Aisha expects all family members present' },
  
  { id: 'evt_29', memberId: 'mem_khalid', title: 'School Football Finals', date: '2026-05-15T15:00:00Z', category: 'Extracurricular', conflict: false },
  { id: 'evt_30', memberId: 'mem_salem', title: 'Attend Khalid\'s Final', date: '2026-05-15T15:00:00Z', category: 'Family', conflict: false },
  { id: 'evt_31', memberId: 'mem_fatima', title: 'Attend Khalid\'s Final', date: '2026-05-15T15:00:00Z', category: 'Family', conflict: false },
]

export const mockMemoriesFromAisha: string[] = [
  "Salem used to climb the lemon tree behind our old house in Al Ain. He fell once, broke his wrist, and refused to cry. Khalid has that same stubbornness.",
  "Fatima makes harees almost exactly like my mother did, though she won't admit it. She has a good heart, even if she worries too much about those vitamins.",
  "When Layla was a toddler, she used to collect seashells at Jumeirah beach and organize them by color. Always so meticulous. I see it now in her studies.",
  "Khalid never stops moving. Reminds me of Salem's younger brother, Majed. Majed couldn't sit still in the majlis for five minutes without finding trouble.",
  "The house feels too quiet when Salem travels for work to Abu Dhabi. The scent of bakhour just doesn't linger the same way when he's not here.",
  "It's strange watching them all rely on these glowing screens. We used to know when a storm was coming just by the smell of the dust in the air."
]
