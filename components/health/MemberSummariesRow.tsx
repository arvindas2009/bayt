'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { FamilyMember } from '@/types'
import type { MemberSummary } from '@/types/agents'

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS = {
  good: {
    badge:      { background: '#0a2018', color: '#2ECC8A' },
    flagBg:     '#0a2018',
    flagColor:  '#2ECC8A',
    ringColor:  '#2ECC8A',
    label:      'GOOD',
  },
  monitor: {
    badge:      { background: '#2e2600', color: 'var(--tertiary)' },
    flagBg:     '#2e2600',
    flagColor:  'var(--tertiary)',
    ringColor:  'var(--tertiary)',
    label:      'MONITOR',
  },
  alert: {
    badge:      { background: 'var(--error-container)', color: 'var(--on-error-container)' },
    flagBg:     'var(--error-container)',
    flagColor:  'var(--on-error-container)',
    ringColor:  'var(--error)',
    label:      'ALERT',
  },
} as const

// Stable personal accent per member (index-ordered)
const MEMBER_COLORS = ['#3D7FFF', '#cfbcff', '#2ECC8A', '#e7c365', '#e87040']

// ─── Animation variants ───────────────────────────────────────────────────────

const listVariants: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

interface MemberCardProps {
  member:  FamilyMember
  summary: MemberSummary
  color:   string
}

function MemberCard({ member, summary, color }: MemberCardProps) {
  const s         = STATUS[summary.overallStatus]
  const firstName = member.name.split(' ')[0]
  const lastName  = member.name.split(' ').slice(1).join(' ')
  const initials  = member.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const flags = summary.topFlags.slice(0, 3)

  return (
    <div
      className="flex w-56 shrink-0 flex-col gap-4 p-4"
      style={{
        background: 'var(--surface-container)',
        borderTop:  `3px solid ${color}`,
      }}
    >
      {/* ── Avatar + identity ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        {/* Avatar circle */}
        <div
          className="relative flex size-12 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `${color}18`,
            border:     `2px solid ${color}`,
          }}
        >
          <span
            className="font-mono text-sm font-bold uppercase"
            style={{ color }}
          >
            {initials}
          </span>
          {/* Status dot */}
          <div
            className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full"
            style={{ background: s.ringColor, border: '1.5px solid var(--surface-container)' }}
          />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div
            className="truncate text-sm font-bold leading-tight text-[var(--on-surface)]"
            style={{ fontFamily: 'var(--font-space-grotesk)', color }}
          >
            {firstName}
          </div>
          {lastName && (
            <div className="truncate font-mono text-[10px] text-[var(--on-surface-variant)]">
              {lastName}
            </div>
          )}
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            {member.role} · {member.age}y
          </div>
        </div>
      </div>

      {/* ── Status badge ───────────────────────────────────────────────────── */}
      <div>
        <span
          className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
          style={s.badge}
        >
          {s.label}
        </span>
      </div>

      {/* ── Top flags as pills ─────────────────────────────────────────────── */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag, i) => (
            <span
              key={i}
              className="rounded-sm px-2 py-0.5 font-mono text-[10px] leading-snug"
              style={{ background: s.flagBg, color: s.flagColor }}
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── View profile link ──────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '12px' }}>
        <Link
          href={`/health/${member.id}`}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors hover:opacity-80"
          style={{ color }}
        >
          View profile
          <ArrowUpRight className="size-3 shrink-0" />
        </Link>
      </div>
    </div>
  )
}

// ─── MemberSummariesRow ───────────────────────────────────────────────────────

interface Props {
  members:   FamilyMember[]
  summaries: MemberSummary[]
}

export default function MemberSummariesRow({ members, summaries }: Props) {
  const summaryById = Object.fromEntries(summaries.map((s) => [s.memberId, s]))

  const cards = members
    .slice(0, 5)
    .map((m, i) => ({ member: m, summary: summaryById[m.id], color: MEMBER_COLORS[i] ?? '#cfbcff' }))
    .filter((c): c is { member: FamilyMember; summary: MemberSummary; color: string } => !!c.summary)

  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{
        borderTop:    '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      <header className="px-10 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Member Intelligence · {summaries.length} profiles
        </span>
      </header>

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="flex gap-4 overflow-x-auto px-10 pb-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {cards.map(({ member, summary, color }) => (
          <motion.div key={member.id} variants={cardVariants}>
            <MemberCard member={member} summary={summary} color={color} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
