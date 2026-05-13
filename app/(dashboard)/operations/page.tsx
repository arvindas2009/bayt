'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, AlertTriangle, ArrowRight, CalendarPlus } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import AgentStatusDot from '@/components/layout/AgentStatusDot'
import MealPlanGrid from '@/components/operations/MealPlanGrid'
import CalendarConflicts from '@/components/operations/CalendarConflicts'
import SchoolAdminDrafts from '@/components/operations/SchoolAdminDrafts'
import SchoolHealthBriefs from '@/components/operations/SchoolHealthBriefs'
import FamilyAgenda from '@/components/operations/FamilyAgenda'
import AddEventModal from '@/components/calendar/AddEventModal'

// ─── Skeletons ────────────────────────────────────────────────────────────────

const PULSE = 'bg-[var(--surface-container-high)]'

function MealGridSkeleton() {
  return (
    <section
      className="animate-pulse bg-[var(--surface-container-lowest)] p-6"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className={`h-3 w-36 ${PULSE}`} />
        <div className={`h-3 w-28 ${PULSE}`} />
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className={`h-3 ${PULSE}`} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className={`h-20 ${PULSE}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <section
      className="animate-pulse bg-[var(--surface-container-lowest)] p-6"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className={`mb-5 h-3 w-32 ${PULSE}`} />
      <div className="space-y-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className={`h-3 ${PULSE}`} style={{ width: `${60 + (i % 3) * 13}%` }} />
            <div className={`h-3 ${PULSE}`} style={{ width: `${42 + (i % 2) * 18}%` }} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
      <div
        className="flex size-16 items-center justify-center"
        style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container)' }}
      >
        <AlertTriangle className="size-7 text-[var(--error)]" />
      </div>
      <div>
        <h2
          className="text-2xl font-bold tracking-tight text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Agent run failed
        </h2>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Could not reach the Operations agent — check your API key and connection.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-3 px-8 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
      >
        <RefreshCw className="size-3.5" />
        Retry
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { agentStatuses, agentOutputs, runAgent } = useAgentStore()
  const family = useFamilyStore((s) => s.family)
  const status = agentStatuses.operations
  const output = agentOutputs.operations
  const isThinking = status === 'thinking'
  const isPreview = Boolean(output?._mock)
  const [showAddEvent, setShowAddEvent] = useState(false)

  useEffect(() => {
    if (!output) runAgent('operations')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!output && status !== 'idle') {
    return (
      <div className="flex flex-col">
        <div
          className="flex animate-pulse items-center justify-between px-10 py-3"
          style={{ borderBottom: '1px solid var(--outline-variant)' }}
        >
          <div className="flex items-center gap-3">
            <div className={`h-4 w-24 ${PULSE}`} />
            <div className={`h-3 w-10 ${PULSE}`} />
          </div>
          <div className={`h-3 w-20 ${PULSE}`} />
        </div>
        <div className="flex flex-col gap-4 p-10">
          <MealGridSkeleton />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ListSkeleton rows={3} />
            <ListSkeleton rows={2} />
          </div>
        </div>
      </div>
    )
  }

  if (!output && status === 'idle') {
    return <ErrorState onRetry={() => runAgent('operations')} />
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-base font-bold tracking-tight text-[var(--on-surface)]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Operations
          </h1>
          <AgentStatusDot name="OPS" status={status} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddEvent(true)}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-colors px-3 py-1.5"
            style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', border: '1px solid transparent' }}
          >
            <CalendarPlus className="size-3.5" />
            Add Event
          </button>
          <button
            onClick={() => runAgent('operations')}
            disabled={isThinking}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)] disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 ${isThinking ? 'animate-spin' : ''}`} />
            {isThinking ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>

      {output && isPreview && (
        <div
          className="px-10 py-3"
          style={{ background: 'rgba(231,195,101,0.08)', borderBottom: '1px solid var(--outline-variant)' }}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
            Preview data
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
            The live agent response was unavailable, so this screen is showing preview output instead.
            {output._error ? ` ${output._error}` : ''}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-4 p-10">
        <section
          className="bg-[var(--surface-container-lowest)] p-6"
          style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
        >
          <header className="mb-5 flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              7-Day Meal Plan
            </span>
            <Link
              href="/operations/meal-plan"
              className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-[var(--primary)] transition-opacity hover:opacity-70"
            >
              View full meal plan
              <ArrowRight className="size-3" />
            </Link>
          </header>
          <MealPlanGrid weeklyPlan={output!.weeklyPlan} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
          {/* Left panel: Agenda */}
          <FamilyAgenda />

          {/* Right panel: Alerts & Drafts stacked vertically or in grid */}
          <div className="flex flex-col gap-4">
            <CalendarConflicts conflicts={output!.calendarConflicts} />
            <SchoolAdminDrafts drafts={output!.schoolDrafts} />
            <SchoolHealthBriefs
              briefs={output!.schoolHealthBriefs ?? []}
              members={family?.members ?? []}
            />
          </div>
        </div>
      </div>
      {showAddEvent && <AddEventModal onClose={() => setShowAddEvent(false)} />}
    </div>
  )
}

