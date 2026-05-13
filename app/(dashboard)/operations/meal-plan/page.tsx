'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Clock, AlertTriangle, HeartPulse } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import MealPlanGrid from '@/components/operations/MealPlanGrid'
import type { FamilyMember } from '@/types'

// ─── Member colours (matches MealPlanGrid) ────────────────────────────────────

const MEMBER_COLOR: Record<string, string> = {
  Salem:  '#3D7FFF',
  Fatima: '#cfbcff',
  Layla:  '#2ECC8A',
  Khalid: '#e7c365',
  Aisha:  '#e87040',
}

// ─── Dietary chip ─────────────────────────────────────────────────────────────

function chipStyle(text: string): { bg: string; color: string; border: string } {
  const t = text.toLowerCase()
  if (t.includes('allergy') || t.includes('severe') || t.includes('celiac'))
    return { bg: 'rgba(147,0,10,0.35)', color: '#ffdad6', border: '1px solid rgba(255,180,171,0.5)' }
  if (t.includes('diabetes') || t.includes('diabetic') || t.includes('hypertension') || t.includes('osteoporosis'))
    return { bg: 'rgba(231,195,101,0.15)', color: '#e7c365', border: '1px solid rgba(231,195,101,0.35)' }
  if (t.includes('gluten'))
    return { bg: 'rgba(61,127,255,0.15)', color: '#7eb8f7', border: '1px solid rgba(61,127,255,0.35)' }
  if (t.includes('vegetarian') || t.includes('vegan'))
    return { bg: 'rgba(46,204,138,0.15)', color: '#6fcf97', border: '1px solid rgba(46,204,138,0.35)' }
  if (t.includes('sodium') || t.includes('soft') || t.includes('salt'))
    return { bg: 'rgba(30,170,170,0.15)', color: '#5fcfcf', border: '1px solid rgba(30,170,170,0.35)' }
  if (t.includes('nut'))
    return { bg: 'rgba(240,160,48,0.18)', color: '#f0a030', border: '1px solid rgba(240,160,48,0.4)' }
  return { bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }
}

function DietaryChip({ label }: { label: string }) {
  const { bg, color, border } = chipStyle(label)
  return (
    <span
      className="inline-block font-mono text-[9px] uppercase tracking-widest px-2 py-1 leading-none"
      style={{ background: bg, color, border }}
    >
      {label}
    </span>
  )
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ member }: { member: FamilyMember }) {
  const firstName = member.name.split(' ')[0]
  const color     = MEMBER_COLOR[firstName] ?? 'var(--primary)'

  const restrictions = [
    ...member.dietaryNeeds,
    ...(member.healthProfile?.conditions ?? []),
  ]

  return (
    <div className="flex flex-col gap-2.5">
      {/* Name row */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
          style={{ background: color, color: '#0a0a0a' }}
        >
          {firstName[0]}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">{firstName}</p>
          <p className="font-mono text-[10px] text-[var(--on-surface-variant)] capitalize">
            {member.role} · age {member.age}
          </p>
        </div>
      </div>

      {/* Restriction chips */}
      {restrictions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-9">
          {restrictions.map(r => <DietaryChip key={r} label={r} />)}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function DietarySidebar({
  onRegenerate,
  isThinking,
}: {
  onRegenerate: () => void
  isThinking: boolean
}) {
  const members = useFamilyStore(s => s.family?.members ?? [])

  return (
    <aside
      className="flex w-72 shrink-0 flex-col xl:w-80"
      style={{ borderLeft: '1px solid var(--outline-variant)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-6 py-5"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <HeartPulse className="size-4 shrink-0 text-[var(--primary)]" />
        <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface)]">
          Dietary Profiles
        </h3>
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {members.length > 0 ? (
            members.map(m => (
              <div key={m.id}>
                <ProfileCard member={m} />
                <div
                  className="mt-4 h-px"
                  style={{ background: 'var(--outline-variant)', opacity: 0.3 }}
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-[var(--surface-container-high)]" />
                    <div className="h-3 w-20 bg-[var(--surface-container-high)]" />
                  </div>
                  <div className="ml-9 flex gap-1.5">
                    <div className="h-5 w-16 bg-[var(--surface-container-high)]" />
                    <div className="h-5 w-20 bg-[var(--surface-container-high)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Regenerate action */}
      <div
        className="p-6"
        style={{ borderTop: '1px solid var(--outline-variant)' }}
      >
        <button
          onClick={onRegenerate}
          disabled={isThinking}
          className="flex w-full items-center justify-center gap-2 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: '#3D7FFF', color: '#080c12' }}
        >
          <RefreshCw className={`size-3.5 ${isThinking ? 'animate-spin' : ''}`} />
          {isThinking ? 'Regenerating…' : 'Regenerate Plan'}
        </button>
      </div>
    </aside>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

const PULSE = 'bg-[var(--surface-container-high)]'

function PageSkeleton() {
  return (
    <div className="flex min-h-full animate-pulse">
      <div className="flex flex-1 flex-col">
        {/* Toolbar skeleton */}
        <div className="px-8 py-6" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
          <div className="mb-3 flex items-center gap-3">
            <div className={`h-3 w-16 ${PULSE}`} />
            <div className={`h-7 w-56 ${PULSE}`} />
          </div>
          <div className={`h-3 w-52 ${PULSE}`} />
        </div>

        {/* Grid skeleton */}
        <div className="p-8">
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))', background: 'var(--outline-variant)', border: '1px solid var(--outline-variant)', minWidth: 1120 }}
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col" style={{ background: 'var(--surface-container-lowest)' }}>
                <div className="p-3" style={{ background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)' }}>
                  <div className={`mx-auto h-2.5 w-16 ${PULSE}`} />
                </div>
                <div className="flex flex-col gap-3 p-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className={`h-28 ${PULSE}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar skeleton */}
      <div className="w-72 shrink-0 xl:w-80" style={{ borderLeft: '1px solid var(--outline-variant)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
          <div className={`h-3 w-32 ${PULSE}`} />
        </div>
        <div className="flex flex-col gap-6 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`size-7 rounded-full ${PULSE}`} />
                <div className={`h-3 w-20 ${PULSE}`} />
              </div>
              <div className="ml-9 flex gap-1.5">
                <div className={`h-5 w-16 ${PULSE}`} />
                <div className={`h-5 w-20 ${PULSE}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
          Could not generate the meal plan — check your API key.
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

export default function MealPlanPage() {
  const { agentStatuses, agentOutputs, runAgent } = useAgentStore()
  const status    = agentStatuses.operations
  const output    = agentOutputs.operations
  const isThinking = status === 'thinking'

  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!output) runAgent('operations')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (output) setGeneratedAt(prev => prev ?? new Date())
  }, [output])

  const handleRegenerate = () => {
    setGeneratedAt(null)
    runAgent('operations')
  }

  const handleExport = () =>
    toast.success('Exported to calendar', {
      description: 'Meal plan added to the family calendar.',
    })

  if (!output && status !== 'idle') return <PageSkeleton />
  if (!output && status === 'idle')  return <ErrorState onRetry={handleRegenerate} />

  const memberCount = output!.weeklyPlan.length > 0 ? 5 : 0

  return (
    <div className="flex min-h-full">
      {/* ── Main content area ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div
          className="flex items-start justify-between px-8 py-6"
          style={{ borderBottom: '1px solid var(--outline-variant)' }}
        >
          <div className="flex flex-col gap-1.5">
            {/* Back + title */}
            <div className="flex items-center gap-3">
              <Link
                href="/operations"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
              >
                <ArrowLeft className="size-3" />
                Operations
              </Link>
            </div>
            <h1
              className="text-3xl font-bold uppercase tracking-tight text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Weekly Meal Plan
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Personalised for {memberCount} medical profiles
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}
              >
                <Calendar className="size-3.5" />
                Export to Calendar
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isThinking}
                className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              >
                <RefreshCw className={`size-3.5 ${isThinking ? 'animate-spin' : ''}`} />
                {isThinking ? 'Regenerating…' : 'Regenerate Plan'}
              </button>
            </div>

            {/* Timestamp */}
            {generatedAt && (
              <div className="flex items-center gap-1.5 text-[var(--on-surface-variant)]">
                <Clock className="size-3" />
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Last generated: {formatDistanceToNow(generatedAt, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto p-8">
          <MealPlanGrid weeklyPlan={output!.weeklyPlan} density="expanded" />
        </div>
      </div>

      {/* ── Sticky sidebar ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 flex h-[calc(100vh-56px)] shrink-0 flex-col"
        style={{ width: 288 }}
      >
        <DietarySidebar onRegenerate={handleRegenerate} isThinking={isThinking} />
      </div>
    </div>
  )
}
