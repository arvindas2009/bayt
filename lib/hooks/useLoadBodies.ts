'use client'

import { useEffect, useMemo } from 'react'
import { useBriefingStore } from '@/store/briefing-store'
import { useFamilyStore } from '@/store/family-store'
import { buildFieldBodies, describeField } from '@/lib/load/field-layout'

/**
 * Bodies, aria sentence and raw figures for <LoadField />, from the live load snapshot the
 * briefing endpoint ships (which is computeLoad's output). Fetches the briefing if no page has.
 */
export function useLoadBodies() {
  const members = useFamilyStore((s) => s.family?.members)
  const briefing = useBriefingStore((s) => s.currentBriefing)
  const fetchBriefing = useBriefingStore((s) => s.fetchBriefing)

  useEffect(() => {
    if (!briefing) fetchBriefing().catch((err) => console.error('useLoadBodies:', err))
  }, [briefing, fetchBriefing])

  return useMemo(() => {
    const figures = briefing?.load?.members ?? []
    const list = members ?? []
    return {
      ready: list.length > 0 && Boolean(briefing?.load),
      bodies: buildFieldBodies(list, figures),
      figures,
      ariaLabel: describeField(list, figures),
      totalHours: briefing?.load?.totalHours ?? 0,
    }
  }, [members, briefing])
}
