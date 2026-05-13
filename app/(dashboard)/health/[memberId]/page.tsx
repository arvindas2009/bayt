'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertTriangle, Dna } from 'lucide-react'
import { useFamilyStore } from '@/store/family-store'
import { useAgentStore } from '@/store/agent-store'
import HealthTimeline        from '@/components/health/HealthTimeline'
import LabResultsTable       from '@/components/health/LabResultsTable'
import ActiveMedicationsList from '@/components/health/ActiveMedicationsList'
import RelatedFamilyPatterns from '@/components/health/RelatedFamilyPatterns'
import HealthTwinChart       from '@/components/health/HealthTwinChart'
import type { FamilyMember } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_COLORS = ['#3D7FFF', '#cfbcff', '#2ECC8A', '#e7c365', '#e87040']

const STATUS_BADGE = {
  good:    { bg: '#0a2018', color: '#2ECC8A',       label: 'GOOD'    },
  monitor: { bg: '#2e2600', color: 'var(--tertiary)', label: 'MONITOR' },
  alert:   { bg: 'var(--error-container)', color: 'var(--on-error-container)', label: 'ALERT' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberStatus(m: FamilyMember): 'good' | 'monitor' | 'alert' {
  const labs = m.healthProfile?.lastLabResults ?? []
  if (labs.some((l) => l.status === 'alert')) return 'alert'
  if (labs.some((l) => l.status === 'monitor') || (m.healthProfile?.riskFlags?.length ?? 0) > 0)
    return 'monitor'
  return 'good'
}

function formatSyncTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: '2-digit',
    })
  } catch {
    return '—'
  }
}

function latestLabDate(m: FamilyMember): string {
  const labs = m.healthProfile?.lastLabResults ?? []
  if (!labs.length) return '—'
  const sorted = [...labs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  return formatSyncTime(sorted[0].date)
}

const PULSE = 'bg-[var(--surface-container-high)]'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-0">
      {/* Back link bar */}
      <div style={{ borderBottom: '1px solid var(--outline-variant)' }} className="px-10 py-3">
        <div className={`h-3 w-40 ${PULSE}`} />
      </div>
      {/* Header */}
      <div className="flex items-center gap-5 px-10 py-6" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
        <div className={`size-16 rounded-full ${PULSE}`} />
        <div className="flex flex-col gap-2">
          <div className={`h-6 w-40 ${PULSE}`} />
          <div className={`h-3 w-28 ${PULSE}`} />
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 px-8 py-5"
            style={{ borderRight: i < 3 ? '1px solid var(--outline-variant)' : 'none' }}
          >
            <div className={`h-2.5 w-20 ${PULSE}`} />
            <div className={`h-5 w-24 ${PULSE}`} />
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="grid grid-cols-12 gap-0 p-0">
        <div className="col-span-8" style={{ borderRight: '1px solid var(--outline-variant)' }}>
          <div className={`mx-6 my-6 h-52 ${PULSE}`} />
          <div className={`mx-6 my-6 h-40 ${PULSE}`} />
        </div>
        <div className="col-span-4">
          <div className={`mx-6 my-6 h-48 ${PULSE}`} />
          <div className={`mx-6 my-6 h-32 ${PULSE}`} />
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, unit, accent, isLast,
}: { label: string; value: string | number; unit?: string; accent?: string; isLast?: boolean }) {
  return (
    <div
      className="flex flex-col gap-1 px-8 py-5"
      style={{ borderRight: isLast ? 'none' : '1px solid var(--outline-variant)' }}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-mono text-xl font-bold tabular-nums"
          style={{ color: accent ?? 'var(--on-surface)', fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">{unit}</span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'twin'

export default function MemberHealthPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = use(params)

  const family      = useFamilyStore((s) => s.family)
  const healthOutput = useAgentStore((s) => s.agentOutputs.health)
  const [apiFallback, setApiFallback] = useState<FamilyMember | null>(null)
  const [fetchError,  setFetchError]  = useState(false)
  const [activeTab,   setActiveTab]   = useState<Tab>('overview')

  // Store is the primary source (FamilyHydrator populates it in the layout).
  // Fall back to direct API if the member can't be found in the store.
  const storeMatch = family?.members.find((m) => m.id === memberId)

  useEffect(() => {
    if (storeMatch) return
    if (!family) return // still loading from store — wait
    // Member not in store → fetch directly
    fetch(`/api/family/members/${memberId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json() as Promise<FamilyMember>
      })
      .then(setApiFallback)
      .catch(() => setFetchError(true))
  }, [memberId, storeMatch, family])

  // ── Waiting for family store hydration ────────────────────────────────────
  if (!family) return <PageSkeleton />

  const member = storeMatch ?? apiFallback

  // ── Member not found ──────────────────────────────────────────────────────
  if (!member && (fetchError || family)) {
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
            Member not found
          </h2>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            No member with ID: {memberId}
          </p>
        </div>
        <Link
          href="/health"
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="size-3.5" />
          Back to health map
        </Link>
      </div>
    )
  }

  // ── Still fetching fallback ────────────────────────────────────────────────
  if (!member) return <PageSkeleton />

  // ── Derived values ────────────────────────────────────────────────────────
  const memberIndex  = family.members.findIndex((m) => m.id === memberId)
  const accentColor  = MEMBER_COLORS[memberIndex] ?? '#cfbcff'
  const status       = memberStatus(member)
  const badge        = STATUS_BADGE[status]
  const wearable     = member.healthProfile?.wearableData
  const firstName    = member.name.split(' ')[0]
  const initials     = member.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const conditions   = member.healthProfile?.conditions ?? []
  const twin         = healthOutput?.healthTwins?.find((t) => t.memberId === memberId) ?? null
  const ancestorMember = twin?.relatedAncestorId
    ? family.members.find((m) => m.id === twin.relatedAncestorId)
    : null

  return (
    <div className="flex flex-col">

      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <Link
          href="/health"
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
        >
          <ArrowLeft className="size-3.5" />
          Family Health Map
        </Link>
      </div>

      {/* ── Member header ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-6 px-10 py-6"
        style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        {/* Avatar */}
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `${accentColor}18`,
            border:     `2.5px solid ${accentColor}`,
            boxShadow:  `0 0 0 4px ${accentColor}10`,
          }}
        >
          <span
            className="font-mono text-lg font-bold uppercase"
            style={{ color: accentColor }}
          >
            {initials}
          </span>
        </div>

        {/* Identity */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {member.name}
            </h1>
            <span
              className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              {member.role} · {member.age} years old
            </span>
            {conditions.length > 0 && (
              <span className="text-[var(--outline-variant)]">·</span>
            )}
            {conditions.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-sm px-2 py-0.5 font-mono text-[10px]"
                style={{ background: `${accentColor}18`, color: accentColor }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Wearable sync indicator */}
        {wearable?.lastSync && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-green-400" />
            <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
              Synced {new Date(wearable.lastSync).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        <StatCard
          label="Resting HR"
          value={wearable?.avgHeartRate ?? '—'}
          unit="bpm"
          accent={accentColor}
        />
        <StatCard
          label="Avg Sleep"
          value={wearable?.sleepHours ?? '—'}
          unit="hrs"
          accent={wearable && wearable.sleepHours < 6 ? 'var(--error)' : wearable && wearable.sleepHours < 7 ? 'var(--tertiary)' : '#2ECC8A'}
        />
        <StatCard
          label="Daily Steps"
          value={wearable ? (wearable.steps >= 1000 ? `${(wearable.steps / 1000).toFixed(1)}k` : wearable.steps) : '—'}
          accent={wearable && wearable.steps >= 10_000 ? '#2ECC8A' : wearable && wearable.steps >= 7_000 ? 'var(--tertiary)' : 'var(--error)'}
        />
        <StatCard
          label="Active Meds"
          value={member.medications.length}
          accent={member.medications.length > 2 ? 'var(--tertiary)' : accentColor}
          isLast
        />
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-0"
        style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'twin',     label: 'Health Twin', icon: true },
        ] as { id: Tab; label: string; icon?: boolean }[]).map((tab) => {
          const isActive = activeTab === tab.id
          const hasTwin  = tab.id === 'twin' && !!twin
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors"
              style={{
                color:        isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                background:   'transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.icon && <Dna className="size-3" />}
              {tab.label}
              {hasTwin && (
                <span
                  className="px-1 py-0.5 text-[9px]"
                  style={{
                    background: isActive ? 'rgba(207, 188, 255, 0.2)' : 'rgba(207, 188, 255, 0.1)',
                    color: '#cfbcff',
                  }}
                >
                  LIVE
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12">

          {/* Left: timeline + labs */}
          <div
            className="lg:col-span-8 flex flex-col gap-0"
            style={{ borderRight: '1px solid var(--outline-variant)' }}
          >
            <HealthTimeline member={member} accentColor={accentColor} />
            <LabResultsTable labResults={member.healthProfile?.lastLabResults ?? []} />
          </div>

          {/* Right: meds + patterns + risk flags */}
          <div className="lg:col-span-4 flex flex-col gap-0">
            <ActiveMedicationsList medications={member.medications} accentColor={accentColor} />
            <RelatedFamilyPatterns memberId={memberId} />

            {(member.healthProfile?.riskFlags?.length ?? 0) > 0 && (
              <section
                className="bg-[var(--surface-container-lowest)]"
                style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
              >
                <div
                  className="flex items-center gap-2 px-6 py-4"
                  style={{ borderBottom: '1px solid var(--outline-variant)' }}
                >
                  <RefreshCw className="size-3.5 text-[var(--error)]" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
                    Risk Flags
                  </span>
                </div>
                <ul className="flex flex-col gap-2 px-6 py-4">
                  {member.healthProfile!.riskFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="mt-1.5 size-1.5 shrink-0 bg-[var(--error)]" />
                      <span className="text-xs leading-relaxed text-[var(--on-surface-variant)]">
                        {flag}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ── Health Twin tab ───────────────────────────────────────────────── */}
      {activeTab === 'twin' && (
        <div className="p-8">
          {twin ? (
            <div className="flex flex-col gap-6">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-base font-bold tracking-tight text-[var(--on-surface)]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    Generational Health Projection · {firstName}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-[var(--on-surface-variant)]">
                    15-year risk trajectory in 3-year increments
                  </p>
                </div>
                {ancestorMember && (
                  <Link
                    href={`/health/${ancestorMember.id}`}
                    className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest transition-colors hover:opacity-80"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Dna className="size-3" />
                    View {ancestorMember.name.split(' ')[0]}&apos;s profile
                  </Link>
                )}
              </div>

              <HealthTwinChart
                twin={twin}
                memberName={member.name}
                ancestorName={ancestorMember?.name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Dna className="size-10 text-[var(--on-surface-variant)] opacity-30" />
              <div>
                <p
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  No generational projection available
                </p>
                <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--outline-variant)' }}>
                  The Health Agent did not find a cross-generational ancestor link for {firstName}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
