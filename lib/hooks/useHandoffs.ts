'use client'

import { useCallback, useEffect, useState } from 'react'
import { useBriefingStore } from '@/store/briefing-store'
import type { Handoff } from '@/types/family'

type Action = 'accept' | 'decline' | 'redirect'

export interface RespondOutcome {
  ok: boolean
  error?: string
}

/**
 * The consent inbox for one member: handoffs proposed TO them that are still pending.
 * `respond` calls the API, then refreshes the briefing so every number (load, priority) reflects
 * the new owner. `onAccepted` lets a page animate the move (LoadField flow).
 */
export function useHandoffs(memberId: string | null, onAccepted?: (h: Handoff) => void) {
  const refreshBriefing = useBriefingStore((s) => s.refreshBriefing)
  const [pending, setPending] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!memberId) return
    try {
      const res = await fetch(`/api/handoffs?toId=${encodeURIComponent(memberId)}&status=pending`, { cache: 'no-store' })
      if (res.ok) setPending((await res.json()) as Handoff[])
    } catch (err) {
      console.error('useHandoffs:', err)
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    setLoading(true)
    setPending([])
    load()
  }, [load])

  const respond = useCallback(
    async (handoff: Handoff, action: Action, redirectToId?: string): Promise<RespondOutcome> => {
      setBusyId(handoff.id)
      try {
        const res = await fetch(`/api/handoffs/${handoff.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, redirectToId }),
        })
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          await load()
          return { ok: false, error: body.error ?? 'Could not save your answer' }
        }
        if (action === 'accept') onAccepted?.(handoff)
        await Promise.all([load(), refreshBriefing().catch(() => undefined)])
        return { ok: true }
      } catch {
        return { ok: false, error: 'Could not reach the server' }
      } finally {
        setBusyId(null)
      }
    },
    [load, onAccepted, refreshBriefing],
  )

  return { pending, loading, busyId, respond, reload: load }
}
