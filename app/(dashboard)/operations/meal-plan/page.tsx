'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { CardSkeleton } from '@/components/ui/Skeleton'
import MealPlanGrid from '@/components/operations/MealPlanGrid'

const BUTTON =
  'flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-40'

/** Who the plan is written around: each person's dietary needs and conditions, as the planner sees them. */
function WhoItIsFor() {
  const members = useFamilyStore((s) => s.family?.members ?? [])
  const { colorOf } = useMemberLookup()
  return (
    <section aria-labelledby="who-title">
      <h2 id="who-title" className="font-display text-2xl text-[var(--ink)]">Who this plan is written around</h2>
      <ul className="mt-4 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const needs = [...m.dietaryNeeds, ...(m.healthProfile?.conditions ?? [])]
          return (
            <li key={m.id} className="flex items-start gap-3">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: colorOf(m.id) }} aria-hidden />
              <div>
                <p className="text-base text-[var(--ink)]">
                  {m.name} <span className="text-sm capitalize text-[var(--ink-muted)]">{m.role}, <span className="num">{m.age}</span></span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {needs.length > 0 ? needs.join(', ') : 'No dietary needs recorded'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function MealPlanPage() {
  const { agentStatuses, agentOutputs, agentMeta, runAgent } = useAgentStore()
  const status = agentStatuses.operations
  const output = agentOutputs.operations
  const thinking = status === 'thinking'

  useEffect(() => {
    if (!output) runAgent('operations')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-10 pb-20 pt-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <Link
            href="/operations"
            className="mb-3 flex w-fit items-center gap-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Operations
          </Link>
          <h1 className="font-display text-5xl md:text-6xl text-[var(--ink)]">The week&rsquo;s meals</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Open a meal to see who it suits and what the others get instead.</p>
        </div>
        <button onClick={() => runAgent('operations', { force: true })} disabled={thinking} className={BUTTON}>
          <RefreshCw className={`size-3.5 ${thinking ? 'animate-spin' : ''}`} aria-hidden />
          {thinking ? 'Working…' : 'Plan again'}
        </button>
      </header>

      {!output && status !== 'idle' && <CardSkeleton className="h-[420px]" />}

      {!output && status === 'idle' && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-base text-[var(--ink-muted)]">
            The meal plan could not be made{agentMeta.operations?.error ? `: ${agentMeta.operations.error}` : '.'}
          </p>
          <button onClick={() => runAgent('operations', { force: true })} className={BUTTON}>
            <RefreshCw className="size-3.5" aria-hidden />
            Try again
          </button>
        </div>
      )}

      {output && (
        <>
          {output._mock && (
            <p className="-mt-6 text-sm text-[var(--ink-muted)]">
              Showing the built-in plan. The model was unavailable{output._error ? `: ${output._error}` : '.'}
            </p>
          )}
          <MealPlanGrid weeklyPlan={output.weeklyPlan} />
        </>
      )}

      <WhoItIsFor />
    </div>
  )
}
