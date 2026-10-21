'use client'

import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { format, isSameDay, parseISO } from 'date-fns'
import { ArrowRight, Flame } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import { useLoadBodies } from '@/lib/hooks/useLoadBodies'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { isDemoMode } from '@/lib/demo/mode'
import { BURNOUT_THRESHOLD } from '@/lib/load/reference-durations'
import { upcomingAppointments, unbackedCount } from '@/lib/health/appointments'
import { getToday } from '@/lib/time/today'
import type { PinId } from '@/lib/pins/registry'
import { Avatar } from '@/components/ui/Card'
import Highlight from '@/components/ui/Highlight'
import { CardSkeleton } from '@/components/ui/Skeleton'
import AnimatedBar from '@/components/motion/AnimatedBar'
import DropInbox from '@/components/operations/DropInbox'

/** The week's operations plan, loading it from today's stored run if nothing has asked yet. */
function useOperations() {
  const output = useAgentStore((s) => s.agentOutputs.operations)
  const status = useAgentStore((s) => s.agentStatuses.operations)
  const failed = useAgentStore((s) => Boolean(s.agentMeta.operations?.error))
  const runAgent = useAgentStore((s) => s.runAgent)
  const asked = useRef(false)
  useEffect(() => {
    if (output || asked.current) return
    asked.current = true
    void runAgent('operations')
  }, [output, runAgent])
  // Until it arrives or fails, the card shows a skeleton rather than "not ready".
  return { output, waiting: !output && (status === 'thinking' || !failed) }
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-[var(--ink-muted)]">{children}</p>
const Big = ({ value, word, tone = 'ink' }: { value: number; word: string; tone?: 'ink' | 'ember' }) => (
  <p className="flex items-baseline gap-2">
    <span className={`font-display text-5xl ${tone === 'ember' ? 'text-[var(--ember)]' : 'text-[var(--ink)]'}`}>{value}</span>
    <span className="text-sm text-[var(--ink-muted)]">{word}</span>
  </p>
)

function LoadScores() {
  const { figures } = useLoadBodies()
  const { nameOf, colorOf } = useMemberLookup()
  const ranked = [...figures].sort((a, b) => b.score - a.score)
  if (ranked.length === 0) return <Empty>No load figures yet.</Empty>
  return (
    <ul className="flex flex-col gap-2.5">
      {ranked.map((m, i) => {
        const over = m.score >= BURNOUT_THRESHOLD
        return (
          <li key={m.memberId}>
            <div className="flex items-center gap-2 text-sm">
              <Avatar name={nameOf(m.memberId)} color={colorOf(m.memberId)} size="sm" />
              <span className={`flex-1 font-semibold ${over ? 'text-[var(--ember)]' : 'text-[var(--ink)]'}`}>{nameOf(m.memberId)}</span>
              {over && <Flame className="size-3.5 text-[var(--ember)]" aria-label="Over the burnout line" />}
              <span className="num font-semibold text-[var(--ink)]">{m.score}/100</span>
            </div>
            <AnimatedBar value={m.score / 100} color={over ? 'var(--ember)' : colorOf(m.memberId)} tick={BURNOUT_THRESHOLD / 100} className="mt-1.5 h-1.5" delay={i * 0.05} />
          </li>
        )
      })}
    </ul>
  )
}

function Clashes() {
  const { output, waiting } = useOperations()
  if (waiting) return <CardSkeleton className="h-[120px]" />
  if (!output) return <Empty>The week&rsquo;s plan is not ready.</Empty>
  const list = output.calendarConflicts
  if (list.length === 0) return <Empty>No clashes this week.</Empty>
  return (
    <div className="flex flex-col gap-3">
      <Big value={list.length} word={list.length === 1 ? 'clash this week' : 'clashes this week'} tone="ember" />
      <ul className="flex flex-col gap-2">
        {list.slice(0, 2).map((c, i) => (
          <li key={i} className="rounded-xl bg-[var(--surface-raised)] p-3 text-sm leading-snug text-[var(--ink)]">
            <span className="mb-1 block text-xs font-semibold text-[var(--dusk)]">{format(parseISO(c.date), 'EEE d MMM · HH:mm')}</span>
            <Highlight text={c.conflict} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function MealsToday() {
  const { output, waiting } = useOperations()
  if (waiting) return <CardSkeleton className="h-[120px]" />
  const today = format(getToday(), 'EEEE')
  const day = output?.weeklyPlan.find((d) => d.day === today)
  if (!day) return <Empty>No meal plan for {today}.</Empty>
  return (
    <ul className="flex flex-col gap-2">
      {(
        [
          ['Breakfast', day.breakfast],
          ['Lunch', day.lunch],
          ['Dinner', day.dinner],
        ] as const
      ).map(([label, meal]) => (
        <li key={label} className="flex items-baseline justify-between gap-3 rounded-xl bg-[var(--surface-raised)] px-3 py-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">{label}</span>
          <span className="text-right text-sm font-semibold text-[var(--ink)]">{meal.name}</span>
        </li>
      ))}
    </ul>
  )
}

function Appointments() {
  const members = useFamilyStore((s) => s.family?.members)
  const { nameOf, colorOf } = useMemberLookup()
  const list = useMemo(() => upcomingAppointments(members ?? [], getToday()).slice(0, 3), [members])
  if (list.length === 0) return <Empty>No appointments booked in the next three weeks.</Empty>
  return (
    <ul className="flex flex-col gap-2">
      {list.map((e) => {
        const d = parseISO(e.date)
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-raised)] p-2.5">
            <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-[var(--surface)] py-1">
              <span className="font-display text-xl leading-none text-[var(--ink)]">{format(d, 'd')}</span>
              <span className="text-[10px] text-[var(--ink-muted)]">{format(d, 'MMM')}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--ink)]">{e.title}</span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
                <Avatar name={nameOf(e.who)} color={colorOf(e.who)} size="sm" className="!size-4 !text-[9px]" />
                {nameOf(e.who)} · {isSameDay(d, getToday()) ? 'today' : format(d, 'EEE')} <span className="num">{format(d, 'HH:mm')}</span>
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Medications() {
  const members = useFamilyStore((s) => s.family?.members)
  const list = members ?? []
  const total = list.reduce((n, m) => n + m.medications.length, 0)
  const unbacked = unbackedCount(list)
  return (
    <div className="flex flex-col gap-3">
      <Big value={total} word={total === 1 ? 'medication in the family' : 'medications in the family'} />
      {unbacked > 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--ember-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)]">
          <Flame className="size-4 text-[var(--ember)]" aria-hidden />
          {unbacked === 1 ? 'One has' : `${unbacked} have`} only one person who can give {unbacked === 1 ? 'it' : 'them'}
        </p>
      ) : (
        <Empty>Every medication has a backup.</Empty>
      )}
    </div>
  )
}

function School() {
  const { output, waiting } = useOperations()
  if (waiting) return <CardSkeleton className="h-[120px]" />
  if (!output) return <Empty>The week&rsquo;s plan is not ready.</Empty>
  const drafts = output.schoolDrafts.length
  const briefs = output.schoolHealthBriefs ?? []
  const urgent = briefs.filter((b) => b.urgencyLevel === 'urgent').length
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--surface-raised)] p-3">
          <span className="font-display text-3xl text-[var(--ink)]">{drafts}</span>
          <span className="block text-xs text-[var(--ink-muted)]">{drafts === 1 ? 'email to send' : 'emails to send'}</span>
        </div>
        <div className="rounded-xl bg-[var(--surface-raised)] p-3">
          <span className="font-display text-3xl text-[var(--ink)]">{briefs.length}</span>
          <span className="block text-xs text-[var(--ink-muted)]">{briefs.length === 1 ? 'health note' : 'health notes'}</span>
        </div>
      </div>
      {urgent > 0 && (
        <span className="flex w-fit items-center gap-1.5 rounded-full bg-[var(--ember)] px-2.5 py-1 text-xs font-semibold text-[var(--on-ember)]">
          <Flame className="size-3.5" aria-hidden />
          {urgent} urgent
        </span>
      )}
    </div>
  )
}

function StressTest() {
  const { figures } = useLoadBodies()
  const { nameOf, colorOf } = useMemberLookup()
  const top = [...figures].sort((a, b) => b.hours - a.hours)[0]
  if (!top) return <Empty>No load figures yet.</Empty>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={nameOf(top.memberId)} color={colorOf(top.memberId)} size="lg" />
        <p className="text-base leading-snug text-[var(--ink)]">
          What breaks if <span className="font-semibold">{nameOf(top.memberId)}</span> is away?
        </p>
      </div>
      <Link
        href="/load#resilience"
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--ember)] px-3.5 py-1.5 text-sm font-semibold text-[var(--on-ember)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]"
      >
        Run the test <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

/** The body of one pinned card. Every figure here is read from existing computed data. */
export default function PinWidget({ id }: { id: PinId }) {
  switch (id) {
    case 'load-scores':
      return <LoadScores />
    case 'clashes':
      return <Clashes />
    case 'meals-today':
      return <MealsToday />
    case 'drop':
      return <DropInbox demo={isDemoMode} />
    case 'appointments':
      return <Appointments />
    case 'medications':
      return <Medications />
    case 'school':
      return <School />
    case 'stress-test':
      return <StressTest />
  }
}
