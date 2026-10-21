'use client'

import { useMemo } from 'react'
import { useFamilyStore } from '@/store/family-store'
import { useBriefingStore } from '@/store/briefing-store'

/**
 * The member the app is currently shown as. An explicit choice wins; otherwise it is whoever
 * carries the most load this week (never a hard-coded name), then the first member.
 * `settled` is false while the default could still change (the load has not arrived yet), so
 * callers that do costly work per person can wait instead of doing it for the wrong one first.
 */
export function useViewingAs() {
  const family = useFamilyStore((s) => s.family)
  const viewingAsId = useFamilyStore((s) => s.viewingAsId)
  const setViewingAs = useFamilyStore((s) => s.setViewingAs)
  const load = useBriefingStore((s) => s.currentBriefing?.load)

  return useMemo(() => {
    const members = family?.members ?? []
    const topId = [...(load?.members ?? [])].sort((a, b) => b.hours - a.hours)[0]?.memberId
    const member =
      members.find((m) => m.id === viewingAsId) ?? members.find((m) => m.id === topId) ?? members[0] ?? null
    const explicit = members.some((m) => m.id === viewingAsId)
    return {
      member,
      id: member?.id ?? null,
      isExplicit: Boolean(viewingAsId),
      settled: member !== null && (explicit || Boolean(load)),
      setViewingAs,
    }
  }, [family, viewingAsId, load, setViewingAs])
}
