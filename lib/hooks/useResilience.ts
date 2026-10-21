'use client'

import { useCallback, useState } from 'react'
import { create } from 'zustand'
import type { HandoverPlan } from '@/lib/resilience/plan'
import type { AbsenceResult } from '@/lib/resilience/simulate'

/** What the first stress test of a member + duration looked like, to compare a re-run against. */
export interface Baseline {
  failures: number
  singlePoints: number
  busFactor: number
  absentScore: number
}

interface BaselineState {
  baselines: Record<string, Baseline>
  remember: (key: string, b: Baseline) => void
}

/** Survives page navigation (accepting a handoff elsewhere, then coming back to re-run). */
const useBaselineStore = create<BaselineState>((set) => ({
  baselines: {},
  remember: (key, b) => set((s) => (s.baselines[key] ? s : { baselines: { ...s.baselines, [key]: b } })),
}))

export const baselineKey = (absentId: string, days: number) => `${absentId}:${days}`

export type CreatedPlan = HandoverPlan & { created: number }

/**
 * Drives Resilience Mode. `run` is the instant, model-free stress test; `draftPlan` also builds the
 * handover plan and sends the placements as pending handoffs. Calling `run` again (for example after
 * someone accepted a handoff) keeps the plan on screen for the same member and duration.
 */
export function useResilience() {
  const [sim, setSim] = useState<AbsenceResult | null>(null)
  const [plan, setPlan] = useState<CreatedPlan | null>(null)
  const [busy, setBusy] = useState<'run' | 'plan' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const baselines = useBaselineStore((s) => s.baselines)
  const remember = useBaselineStore((s) => s.remember)

  const call = useCallback(
    async (absentId: string, days: number, withPlan: boolean) => {
      setBusy(withPlan ? 'plan' : 'run')
      setError(null)
      try {
        const res = await fetch('/api/resilience', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ absentId, days, withPlan }),
        })
        const body = (await res.json().catch(() => ({}))) as {
          simulation?: AbsenceResult
          plan?: HandoverPlan
          created?: number
          error?: string
        }
        if (!res.ok || !body.simulation) throw new Error(body.error ?? `Stress test failed (${res.status})`)

        const next = body.simulation
        remember(baselineKey(absentId, days), {
          failures: next.failures.length,
          singlePoints: next.resilience.singlePoints.length,
          busFactor: next.resilience.busFactor,
          absentScore: next.absentScore,
        })
        setSim(next)
        if (body.plan) setPlan({ ...body.plan, created: body.created ?? 0 })
        else setPlan((prev) => (prev && sim && sim.absentId === absentId && sim.days === days ? prev : null))
        return next
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stress test failed')
        return null
      } finally {
        setBusy(null)
      }
    },
    [remember, sim],
  )

  const run = useCallback((absentId: string, days: number) => call(absentId, days, false), [call])
  const draftPlan = useCallback((absentId: string, days: number) => call(absentId, days, true), [call])
  const clear = useCallback(() => {
    setSim(null)
    setPlan(null)
    setError(null)
  }, [])

  const baseline = sim ? (baselines[baselineKey(sim.absentId, sim.days)] ?? null) : null

  return { sim, plan, busy, error, baseline, run, draftPlan, clear }
}
