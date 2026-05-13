'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import AgentStatusDot from '@/components/layout/AgentStatusDot'
import FamilyHealthMap from '@/components/health/FamilyHealthMap'
import PatternAlertsRow from '@/components/health/PatternAlertsRow'
import MemberSummariesRow from '@/components/health/MemberSummariesRow'

// ─── Pulse constant ───────────────────────────────────────────────────────────

const PULSE = 'bg-[var(--surface-container-high)]'

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MapSkeleton() {
  // Five pulsing circles in a radial pentagon — mirrors FamilyHealthMap canvas (800×500)
  const vw = 800, vh = 500, cx = vw / 2, cy = vh / 2, r = 140
  const nodes = Array.from({ length: 5 }, (_, i) => ({
    x: cx + r * Math.cos(-Math.PI / 2 + (2 * Math.PI / 5) * i),
    y: cy + r * Math.sin(-Math.PI / 2 + (2 * Math.PI / 5) * i),
  }))

  return (
    <section
      className="animate-pulse bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className="flex items-center gap-3 px-10 py-3">
        <div className={`h-3 w-48 ${PULSE}`} />
      </div>
      <div style={{ background: '#080c12' }}>
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ height: vh, display: 'block' }}>
          {/* Skeleton edges */}
          {nodes.map((a, i) =>
            nodes.slice(i + 1).map((b, j) => (
              <line
                key={`${i}-${j}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="var(--outline-variant)"
                strokeOpacity={0.2}
                strokeWidth={1}
              />
            ))
          )}
          {/* Skeleton nodes */}
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x} cy={n.y} r={26}
              fill="var(--surface-container-high)"
              fillOpacity={0.5}
            />
          ))}
        </svg>
      </div>
    </section>
  )
}

function PatternsSkeleton() {
  return (
    <section
      className="animate-pulse bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className="px-10 py-3">
        <div className={`h-3 w-32 ${PULSE}`} />
      </div>
      <div className="flex gap-4 overflow-hidden px-10 pb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-44 shrink-0 ${PULSE}`} style={{ width: 300 }} />
        ))}
      </div>
    </section>
  )
}

function MembersSkeleton() {
  return (
    <section
      className="animate-pulse bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className="px-10 py-3">
        <div className={`h-3 w-36 ${PULSE}`} />
      </div>
      <div className="flex gap-4 overflow-hidden px-10 pb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-52 shrink-0 ${PULSE}`} style={{ width: 220 }} />
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
          Could not reach the Health agent — check your API key and connection.
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

export default function HealthPage() {
  const { agentStatuses, agentOutputs, runAgent } = useAgentStore()
  const family   = useFamilyStore((s) => s.family)
  const status   = agentStatuses.health
  const output   = agentOutputs.health
  const isThinking = status === 'thinking'

  useEffect(() => {
    if (!output) runAgent('health')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!output && status !== 'idle') {
    return (
      <div className="flex flex-col">
        <div
          className="flex animate-pulse items-center justify-between px-10 py-3"
          style={{ borderBottom: '1px solid var(--outline-variant)' }}
        >
          <div className="flex items-center gap-3">
            <div className={`h-4 w-40 ${PULSE}`} />
            <div className={`h-3 w-12 ${PULSE}`} />
          </div>
          <div className={`h-3 w-20 ${PULSE}`} />
        </div>
        <MapSkeleton />
        <PatternsSkeleton />
        <MembersSkeleton />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (!output && status === 'idle') {
    return <ErrorState onRetry={() => runAgent('health')} />
  }

  // ── Content ──────────────────────────────────────────────────────────────────
  const syncTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

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
            Family Health Map
          </h1>
          <AgentStatusDot name="HEALTH" status={status} />
        </div>
        <div className="flex items-center gap-5">
          <span className="font-mono text-xs text-[var(--on-surface-variant)]">
            Synced {syncTime}
          </span>
          <button
            onClick={() => runAgent('health')}
            disabled={isThinking}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)] disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 ${isThinking ? 'animate-spin' : ''}`} />
            {isThinking ? 'Scanning…' : 'Rescan'}
          </button>
        </div>
      </div>

      {/* Network graph */}
      <FamilyHealthMap
        members={family?.members ?? []}
        crossLinks={output!.crossLinks}
        patterns={output!.familyPatterns}
        healthTwins={output!.healthTwins ?? []}
      />

      {/* Pattern alerts */}
      <PatternAlertsRow patterns={output!.familyPatterns} />

      {/* Member summaries */}
      <MemberSummariesRow
        summaries={output!.memberSummaries}
        members={family?.members ?? []}
      />
    </div>
  )
}
