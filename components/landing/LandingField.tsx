'use client'

import { buildFieldBodies, describeField, type LoadFigures } from '@/lib/load/field-layout'
import LoadFieldLazy from '@/components/visual/LoadFieldLazy'

/**
 * A made-up household for the landing page, so the first screen shows what Bayt draws without
 * needing a database. The caption beside it says it is a sample.
 */
const MEMBERS = [
  { id: 's1', name: 'Salem' },
  { id: 's2', name: 'Fatima' },
  { id: 's3', name: 'Layla' },
  { id: 's4', name: 'Khalid' },
  { id: 's5', name: 'Aisha' },
]

const FIGURES: LoadFigures[] = [
  { memberId: 's1', hours: 7.9, score: 39, shareOfLoad: 27 },
  { memberId: 's2', hours: 17.5, score: 88, shareOfLoad: 60 },
  { memberId: 's3', hours: 1.2, score: 6, shareOfLoad: 4 },
  { memberId: 's4', hours: 2.4, score: 12, shareOfLoad: 8 },
  { memberId: 's5', hours: 0, score: 0, shareOfLoad: 0 },
]

export default function LandingField() {
  return (
    <LoadFieldLazy
      bodies={buildFieldBodies(MEMBERS, FIGURES)}
      ariaLabel={`Sample household. ${describeField(MEMBERS, FIGURES)}`}
      labels="all"
      className="h-[320px] w-full md:h-[420px]"
    />
  )
}
