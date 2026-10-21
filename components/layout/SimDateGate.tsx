'use client'

import { useEffect, useState } from 'react'
import { isDemoMode } from '@/lib/demo/mode'
import { setSimDate } from '@/lib/time/today'

/**
 * In demo mode, loads the simulated date from the server and applies it to this tab before any
 * child renders, so every `getToday()` call on the client agrees with the server. Outside demo mode
 * it renders children straight away and does nothing.
 */
export default function SimDateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isDemoMode)

  useEffect(() => {
    if (!isDemoMode) return
    let cancelled = false
    fetch('/api/sim', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ date: string | null }>) : null))
      .then((s) => setSimDate(s?.date ?? null))
      .catch(() => setSimDate(null))
      .finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  return ready ? <>{children}</> : null
}
