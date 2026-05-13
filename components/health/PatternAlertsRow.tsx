'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertOctagon, AlertTriangle, Info, Dna } from 'lucide-react'
import { useFamilyStore } from '@/store/family-store'
import type { FamilyPattern } from '@/types/agents'

// ─── Design tokens ────────────────────────────────────────────────────────────

const SEV = {
  critical: {
    border:     'var(--error)',
    badge:      { background: 'var(--error-container)', color: 'var(--on-error-container)' },
    bar:        'var(--error)',
    recoBorder: 'var(--error)',
    label:      'CRITICAL',
    Icon:       AlertOctagon,
  },
  warning: {
    border:     'var(--tertiary)',
    badge:      { background: '#2e2600', color: 'var(--tertiary)' },
    bar:        'var(--tertiary)',
    recoBorder: 'var(--tertiary)',
    label:      'WARNING',
    Icon:       AlertTriangle,
  },
  info: {
    border:     'var(--primary)',
    badge:      { background: 'var(--primary-container)', color: 'var(--on-primary-container)' },
    bar:        'var(--primary)',
    recoBorder: 'var(--primary)',
    label:      'INFO',
    Icon:       Info,
  },
} as const

// Stable personal accent per member (index-ordered, matches graph + summaries)
const MEMBER_COLORS = ['#3D7FFF', '#cfbcff', '#2ECC8A', '#e7c365', '#e87040']

// ─── Animation variants ───────────────────────────────────────────────────────

const listVariants: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.32, ease: 'easeOut' } },
}

// ─── PatternCard ──────────────────────────────────────────────────────────────

interface PatternCardProps {
  pattern:    FamilyPattern
  colorById:  Record<string, string>
  nameById:   Record<string, string>
}

function PatternCard({ pattern, colorById, nameById }: PatternCardProps) {
  const [recoOpen, setRecoOpen] = useState(false)
  const s   = SEV[pattern.severity]
  const pct = Math.round(pattern.confidence * 100)

  return (
    <div
      className="flex w-80 shrink-0 flex-col"
      style={{
        background:     'var(--surface-container)',
        borderLeft:     `3px solid ${s.border}`,
        scrollSnapAlign: 'start',
      }}
    >
      {/* ── Top section ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-4">

        {/* Severity row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <s.Icon className="size-3" style={{ color: s.border }} />
            <span
              className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
              style={s.badge}
            >
              {s.label}
            </span>
          </div>
          {/* Confidence: bar + percent */}
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-14 overflow-hidden"
              style={{ background: 'var(--outline-variant)' }}
            >
              <div
                className="h-full"
                style={{ width: `${pct}%`, background: s.bar }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-[var(--on-surface-variant)]">
              {pct}%
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-sm font-bold leading-snug text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {pattern.title}
        </h3>

        {/* Description — 3 line clamp */}
        <p
          className="text-xs leading-relaxed text-[var(--on-surface-variant)]"
          style={{
            display:           '-webkit-box',
            WebkitLineClamp:   3,
            WebkitBoxOrient:   'vertical',
            overflow:          'hidden',
          }}
        >
          {pattern.description}
        </p>

        {/* Affected member avatars */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--on-surface-variant)]">
            Affects
          </span>
          <div className="flex -space-x-1.5">
            {pattern.affectedMembers.map((id) => {
              const color = colorById[id] ?? 'var(--primary)'
              const name  = nameById[id] ?? '?'
              return (
                <div
                  key={id}
                  className="flex size-6 items-center justify-center rounded-full"
                  style={{
                    background:  `${color}22`,
                    border:      `1.5px solid ${color}`,
                    boxShadow:   '0 0 0 1.5px var(--surface-container)',
                  }}
                  title={name}
                >
                  <span
                    className="font-mono text-[9px] font-bold leading-none uppercase"
                    style={{ color }}
                  >
                    {name.slice(0, 1)}
                  </span>
                </div>
              )
            })}
          </div>
          {pattern.affectedMembers.length > 1 && (
            <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
              {pattern.affectedMembers.length} members
            </span>
          )}
        </div>
      </div>

      {/* ── Collapsible recommendation ──────────────────────────────────────── */}
      <div
        className="border-t px-4"
        style={{ borderColor: 'var(--outline-variant)' }}
      >
        <button
          onClick={() => setRecoOpen((v) => !v)}
          className="flex w-full items-center justify-between py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
        >
          <span>View recommendation</span>
          {recoOpen
            ? <ChevronUp  className="size-3 shrink-0" />
            : <ChevronDown className="size-3 shrink-0" />
          }
        </button>

        {recoOpen && (
          <div className="pb-4">
            <p
              className="border-l-2 pl-3 font-mono text-[10px] leading-relaxed text-[var(--on-surface-variant)]"
              style={{ borderColor: s.recoBorder }}
            >
              {pattern.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-10 py-10 text-center">
      <div
        className="flex size-10 items-center justify-center"
        style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container)' }}
      >
        <Dna className="size-4 text-[var(--primary)]" />
      </div>
      <p
        className="max-w-xs font-mono text-xs leading-relaxed text-[var(--on-surface-variant)]"
        style={{ letterSpacing: '0.01em' }}
      >
        No cross-family patterns detected. Each member's health is independent right now.
      </p>
    </div>
  )
}

// ─── PatternAlertsRow ─────────────────────────────────────────────────────────

interface Props {
  patterns: FamilyPattern[]
}

export default function PatternAlertsRow({ patterns }: Props) {
  const members = useFamilyStore((s) => s.family?.members ?? [])

  const colorById = Object.fromEntries(
    members.map((m, i) => [m.id, MEMBER_COLORS[i] ?? 'var(--primary)'])
  )
  const nameById = Object.fromEntries(
    members.map((m) => [m.id, m.name.split(' ')[0]])
  )

  const sorted = [...patterns].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 } as const
    return rank[a.severity] - rank[b.severity]
  })

  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{
        borderTop:    '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      <header className="flex items-center justify-between px-10 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Family Patterns
          {patterns.length > 0 && (
            <> · <span className="text-[var(--on-surface)]">{patterns.length}</span> detected</>
          )}
        </span>
        {/* Severity legend */}
        {patterns.length > 0 && (
          <div className="flex items-center gap-4">
            {(['critical', 'warning', 'info'] as const).filter(sev =>
              patterns.some(p => p.severity === sev)
            ).map(sev => {
              const s = SEV[sev]
              return (
                <div key={sev} className="flex items-center gap-1.5">
                  <s.Icon className="size-3" style={{ color: s.border }} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </header>

      {patterns.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="flex gap-4 overflow-x-auto px-10 pb-6"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        >
          {sorted.map((pattern) => (
            <motion.div key={pattern.id} variants={cardVariants}>
              <PatternCard
                pattern={pattern}
                colorById={colorById}
                nameById={nameById}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
