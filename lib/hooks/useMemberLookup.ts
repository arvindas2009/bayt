'use client'

import { useMemo } from 'react'
import { useFamilyStore } from '@/store/family-store'
import { memberColorAt } from '@/lib/design/members'

/**
 * Resolve a member id to what the UI should show. Internal ids (mem_salem) must never reach the
 * screen: every member reference goes through here to get a name, initial and colour.
 */
export function useMemberLookup() {
  const members = useFamilyStore((s) => s.family?.members)

  return useMemo(() => {
    const list = members ?? []
    const index = (id: string) => list.findIndex((m) => m.id === id)
    return {
      members: list,
      /** Given name, or "Someone" when the id is unknown: never the raw id. */
      nameOf: (id: string) => list.find((m) => m.id === id)?.name ?? 'Someone',
      initialOf: (id: string) => (list.find((m) => m.id === id)?.name ?? '?')[0]?.toUpperCase() ?? '?',
      colorOf: (id: string) => memberColorAt(Math.max(index(id), 0)),
      known: (id: string) => index(id) >= 0,
    }
  }, [members])
}
