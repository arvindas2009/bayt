'use client'

import { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import {
  AlertOctagon,
  ArrowRight,
  CircleAlert,
  ClipboardList,
  HandHelping,
  History,
  Info,
  Loader2,
  Play,
  ShieldCheck,
  Split,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import WhyPopover from '@/components/ui/WhyPopover'
import { Avatar, CARD, IconBadge } from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import AnimatedBar from '@/components/motion/AnimatedBar'
import CountUp from '@/components/motion/CountUp'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import PinButton from '@/components/pins/PinButton'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { Baseline, CreatedPlan } from '@/lib/hooks/useResilience'
import { BURNOUT_THRESHOLD } from '@/lib/load/reference-durations'
import type { AbsenceResult, Failure, FailureSeverity } from '@/lib/resilience/simulate'

export const DURATIONS = [3, 7, 14, 30] as const

const SEVERITY: Record<FailureSeverity, { word: string; icon: LucideIcon; color: string; chip: string }> = {
  critical: { word: 'Urgent', icon: AlertOctagon, color: 'var(--ember)', chip: 'bg-[var(--ember)] text-[var(--on-ember)]' },
  high: { word: 'Important', icon: CircleAlert, color: 'var(--zest)', chip: 'bg-[var(--zest)] text-[var(--on-zest)]' },
  medium: { word: 'Routine', icon: Info, color: 'var(--dusk)', chip: 'bg-[var(--dusk)] text-[var(--on-dusk)]' },
}

const sentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

interface Props {
  absentId: string | null
  onAbsentChange: (id: string) => void
  days: number
  onDaysChange: (days: number) => void
  sim: AbsenceResult | null
  plan: CreatedPlan | null
  baseline: Baseline | null
  busy: 'run' | 'plan' | null
  error: string | null
  onRun: () => void
  onDraftPlan: () => void
}

/**
 * Resilience Mode: pick a person and a duration, see which tasks nobody else can do, and draft a
 * handover plan whose placements are requests (never reassignments) the recipient must accept.
 */
export default function ResilienceMode(p: Props) {
  const { members, nameOf, colorOf } = useMemberLookup()
  const { sim } = p
  const stale = sim && (sim.absentId !== p.absentId || sim.days !== p.days)
  const [tab, setTab] = useState('cascade')

  return (
    <section id="resilience" aria-labelledby="resilience-title" className="flex scroll-mt-32 flex-col gap-4">
      {/* Controls */}
      <Reveal className={`${CARD} flex flex-col gap-6`}>
        <div className="flex items-start gap-3">
          <IconBadge icon={Split} tone="ember" />
          <div className="flex-1">
            <h2 id="resilience-title" className="font-display text-3xl text-[var(--ink)]">
              What if someone is not here?
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">
              Choose a person and how long they are away. Bayt walks through those days and finds the tasks that have
              nobody else able to do them. You can also click a person in the picture above.
            </p>
          </div>
          <PinButton id="stress-test" />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div role="radiogroup" aria-label="Who is away" className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = m.id === p.absentId
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => p.onAbsentChange(m.id)}
                  className={`relative flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition-colors active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] ${
                    on ? 'border-transparent text-[var(--on-sand)]' : 'border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="absent-pill"
                      className="absolute inset-0 rounded-full bg-[var(--sand)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Avatar name={m.name} color={colorOf(m.id)} size="sm" className="relative" />
                  <span className="relative">{m.name}</span>
                </button>
              )
            })}
          </div>

          <div role="radiogroup" aria-label="How long they are away" className="flex gap-1 rounded-full bg-[var(--surface-raised)] p-1">
            {DURATIONS.map((d) => {
              const on = d === p.days
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => p.onDaysChange(d)}
                  className={`relative rounded-full px-3.5 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] ${
                    on ? 'text-[var(--bg)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="days-pill"
                      className="absolute inset-0 rounded-full bg-[var(--ink)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">
                    <span className="num">{d}</span> days
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={p.onRun}
            disabled={!p.absentId || p.busy !== null}
            className="flex items-center gap-2 rounded-full bg-[var(--sand)] px-5 py-2 text-sm font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-40"
          >
            {p.busy === 'run' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            {sim ? 'Run again' : 'Run the stress test'}
          </button>
        </div>

        {p.error && (
          <p role="alert" className="text-sm text-[var(--ember)]">
            {p.error}
          </p>
        )}
      </Reveal>

      {sim && (
        <div className={`flex flex-col gap-4 transition-opacity ${stale ? 'opacity-50' : ''}`} aria-live="polite">
          {stale && (
            <p className="text-sm text-[var(--ink-muted)]">
              These results are for {nameOf(sim.absentId)} away {sim.days} days. Run again to update them.
            </p>
          )}
          <Verdict key={`${sim.absentId}-${sim.days}`} sim={sim} />
          <div className={CARD}>
            <Tabs
              label="Stress test results"
              value={tab}
              onChange={setTab}
              tabs={[
                ...(sim.failures.length > 0
                  ? [{ id: 'cascade', label: 'How it unravels', icon: Waves, count: sim.failures.length, content: <Cascade sim={sim} /> }]
                  : []),
                ...(sim.resilience.groups > 0
                  ? [{ id: 'fragile', label: 'Fragile spots', icon: Split, count: sim.resilience.singlePoints.length, content: <BusFactor sim={sim} /> }]
                  : []),
                { id: 'cover', label: 'Who steps in', icon: HandHelping, count: sim.covered.length, content: <Cover sim={sim} /> },
                ...(sim.failures.length > 0 || p.plan
                  ? [{ id: 'plan', label: 'Handover plan', icon: ClipboardList, content: <HandoverPlan sim={sim} plan={p.plan} busy={p.busy} onDraftPlan={p.onDraftPlan} /> }]
                  : []),
                ...(changed(sim, p.baseline)
                  ? [{ id: 'since', label: 'Since the first run', icon: History, content: <BeforeAfter sim={sim} baseline={p.baseline!} /> }]
                  : []),
              ]}
            />
          </div>
        </div>
      )}
    </section>
  )
}

// ── Verdict ──────────────────────────────────────────────────────────────────────

function Verdict({ sim }: { sim: AbsenceResult }) {
  const { nameOf, colorOf } = useMemberLookup()
  const n = sim.failures.length
  const name = nameOf(sim.absentId)
  const strained = sim.coverLoad.filter((c) => c.scoreAfter >= BURNOUT_THRESHOLD && c.hoursAfter > c.hoursBefore)
  const first = sim.failures[0]

  return (
    <Reveal className={`${CARD} relative overflow-hidden`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-20 -top-20 size-64 rounded-full opacity-20 blur-3xl ${n > 0 ? 'bg-[var(--ember)]' : 'bg-[var(--palm)]'}`}
      />
      <div className="relative flex flex-col gap-3">
        {n > 0 ? (
          <>
            <p className="font-display text-5xl md:text-6xl text-[var(--ink)]">
              <CountUp value={n} className="num text-[var(--ember)]" /> {n === 1 ? 'task has' : 'tasks have'} nobody to do{' '}
              {n === 1 ? 'it' : 'them'}.
            </p>
            <p className="text-base text-[var(--ink-muted)]">
              If {name} is away {plural(sim.days, 'day')}. The first one is needed {first.approximate ? 'by' : 'on'} day{' '}
              <span className="num">{first.day + 1}</span>.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-5xl md:text-6xl text-[var(--ink)]">
              <ShieldCheck className="mr-2 inline size-10 -translate-y-1 text-[var(--palm)]" aria-hidden />
              Nothing would be left undone.
            </p>
            <p className="text-base text-[var(--ink-muted)]">
              Every task {name} owns for the next {plural(sim.days, 'day')} has a named backup who is here.
            </p>
          </>
        )}

        {strained.length > 0 && (
          <ul className="mt-2 grid gap-3 md:grid-cols-2">
            {strained.map((c) => (
              <li key={c.memberId} className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
                  <Avatar name={nameOf(c.memberId)} color={colorOf(c.memberId)} size="sm" />
                  <span>
                    <span className="font-semibold text-[var(--ink)]">{nameOf(c.memberId)}</span> would reach{' '}
                    <span className="num font-semibold text-[var(--ember)]">{c.scoreAfter}/100</span> while covering (now{' '}
                    <span className="num">{c.scoreBefore}/100</span>)
                  </span>
                </p>
                <ScorePair before={c.scoreBefore} after={c.scoreAfter} />
              </li>
            ))}
          </ul>
        )}
        {sim.horizonNote && <p className="text-sm text-[var(--ink-muted)]">{sim.horizonNote}</p>}
      </div>
    </Reveal>
  )
}

/** Two bars, now and while covering, against the burnout line. The numbers are in the text beside it. */
function ScorePair({ before, after }: { before: number; after: number }) {
  const tick = BURNOUT_THRESHOLD / 100
  return (
    <div className="mt-3 flex flex-col gap-1.5" title={`Burnout line ${BURNOUT_THRESHOLD}/100`}>
      <AnimatedBar value={before / 100} color="var(--ink-muted)" className="h-1.5" tick={tick} />
      <AnimatedBar value={after / 100} color={after >= BURNOUT_THRESHOLD ? 'var(--ember)' : 'var(--palm)'} className="h-1.5" tick={tick} delay={0.15} />
    </div>
  )
}

// ── Cascade timeline ─────────────────────────────────────────────────────────────

function Cascade({ sim }: { sim: AbsenceResult }) {
  const { nameOf } = useMemberLookup()
  const byDay = useMemo(() => {
    const groups = new Map<number, Failure[]>()
    for (const f of sim.failures) groups.set(f.day, [...(groups.get(f.day) ?? []), f])
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  }, [sim.failures])

  return (
    <Stagger as="ol" className="relative flex flex-col gap-6" gap={0.08}>
      {/* The spine of the timeline */}
      <span aria-hidden className="absolute bottom-4 left-7 top-4 w-px bg-[var(--line-strong)]" />
      {byDay.map(([day, items]) => (
        <StaggerItem as="li" key={day} className="relative flex gap-5">
          <div className="relative z-10 flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-[var(--line-strong)] bg-[var(--surface)]">
            <span className="text-xs font-semibold leading-none text-[var(--ink-muted)]">Day</span>
            <span className="font-display -mt-0.5 text-xl text-[var(--ink)]">{day + 1}</span>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm text-[var(--ink-muted)]">{format(addDays(parseISO(sim.from), day), 'EEEE d MMMM')}</p>
            <ul className="mt-2 flex flex-col gap-3">
              {items.map((f) => {
                const s = SEVERITY[f.severity]
                const Icon = s.icon
                return (
                  <li key={f.key} className="rounded-2xl bg-[var(--surface-raised)] p-4 transition-transform duration-200 hover:translate-x-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}>
                        <Icon className="size-3" aria-hidden />
                        {s.word}
                      </span>
                      <p className="text-base font-semibold leading-snug text-[var(--ink)]">
                        {f.title}
                        {f.approximate && <span className="font-normal text-[var(--ink-muted)]"> (by day {f.day + 1} at the latest)</span>}
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
                      {f.subjectId && f.subjectId !== f.ownerId && <>For {nameOf(f.subjectId)}. </>}
                      {sentence(f.consequence)}
                      {f.occurrences > 1 && <> It comes up {f.occurrences} times.</>} <WhyPopover sources={f.sources} />
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

// ── Backups stepping in ──────────────────────────────────────────────────────────

function Cover({ sim }: { sim: AbsenceResult }) {
  const { nameOf, colorOf } = useMemberLookup()
  const by = new Map<string, string[]>()
  for (const c of sim.covered) by.set(c.coverId, [...(by.get(c.coverId) ?? []), c.title])
  // People pushed over the burnout line are already shown with their numbers in the verdict.
  const loads = sim.coverLoad.filter((c) => c.hoursAfter > c.hoursBefore && c.scoreAfter < BURNOUT_THRESHOLD)

  if (by.size === 0 && loads.length === 0) {
    return <p className="text-base text-[var(--ink-muted)]">No named backup would step in for these days.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {loads.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-muted)]">
            Their load while covering (burnout line <span className="num">{BURNOUT_THRESHOLD}/100</span>, dashed)
          </h3>
          <Stagger as="ul" className="mt-3 grid gap-3 md:grid-cols-2">
            {loads.map((c) => (
              <StaggerItem as="li" key={c.memberId} className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <p className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <Avatar name={nameOf(c.memberId)} color={colorOf(c.memberId)} size="sm" />
                  <span className="font-semibold">{nameOf(c.memberId)}</span>
                  <span className="num ml-auto text-[var(--ink-muted)]">{c.scoreBefore}/100</span>
                  <ArrowRight className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
                  <span className={`num font-semibold ${c.scoreAfter >= BURNOUT_THRESHOLD ? 'text-[var(--ember)]' : ''}`}>{c.scoreAfter}/100</span>
                </p>
                <ScorePair before={c.scoreBefore} after={c.scoreAfter} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}
      {by.size > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-muted)]">
            {plural(sim.covered.length, 'task')} would be picked up by a named backup
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {[...by.entries()].map(([id, titles]) => (
              <li key={id} className="flex items-start gap-2.5 text-sm text-[var(--ink-muted)]">
                <Avatar name={nameOf(id)} color={colorOf(id)} size="sm" />
                <span>
                  <span className="font-semibold text-[var(--ink)]">{nameOf(id)}</span> takes {titles.join(', ')}.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Bus factor ───────────────────────────────────────────────────────────────────

function BusFactor({ sim }: { sim: AbsenceResult }) {
  const { nameOf } = useMemberLookup()
  const r = sim.resilience
  const exposure = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of r.singlePoints) m.set(s.ownerId, (m.get(s.ownerId) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [r.singlePoints])

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base text-[var(--ink-muted)]">
        {r.busFactor <= 1 ? (
          <>
            Bus factor <span className="num text-[var(--ink)]">1</span>: {plural(r.singlePoints.length, 'job')} this week rest
            on one person.{' '}
            {exposure.map(([id, n], i) => (
              <span key={id}>
                {i > 0 && ' '}
                {nameOf(id)} is the only one for {n}.
              </span>
            ))}
          </>
        ) : (
          <>Every job this week can be done by at least {r.busFactor} people.</>
        )}
      </p>

      <ul className="grid gap-3 md:grid-cols-2">
        {r.byCategory.map((c, i) => (
          <li key={c.category} className="rounded-2xl bg-[var(--surface-raised)] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-[var(--ink)]">{c.label}</span>
              <span className="text-sm text-[var(--ink-muted)]">
                {c.singlePoints === 0 ? (
                  'every job has a backup'
                ) : (
                  <>
                    <span className="num text-[var(--ink)]">{c.singlePoints}</span> of <span className="num">{c.groups}</span> on one person{' '}
                    <WhyPopover sources={r.singlePoints.filter((s) => s.category === c.category).flatMap((s) => s.sources).slice(0, 6)} align="right" />
                  </>
                )}
              </span>
            </div>
            <AnimatedBar
              value={c.groups > 0 ? c.singlePoints / c.groups : 0}
              color={c.singlePoints > 0 ? 'var(--ember)' : 'var(--palm)'}
              className="mt-3 h-2"
              delay={i * 0.06}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Before / after ───────────────────────────────────────────────────────────────

function rowsOf(sim: AbsenceResult, baseline: Baseline, absentName: string) {
  return [
    { label: 'Tasks nobody can do', before: baseline.failures, now: sim.failures.length },
    { label: 'Jobs resting on one person', before: baseline.singlePoints, now: sim.resilience.singlePoints.length },
    { label: `${absentName}'s load this week`, before: baseline.absentScore, now: sim.absentScore, suffix: '/100' },
  ]
}

function changed(sim: AbsenceResult, baseline: Baseline | null): boolean {
  if (!baseline) return false
  return rowsOf(sim, baseline, '').some((r) => r.before !== r.now)
}

function BeforeAfter({ sim, baseline }: { sim: AbsenceResult; baseline: Baseline }) {
  const { nameOf } = useMemberLookup()
  const rows = rowsOf(sim, baseline, nameOf(sim.absentId))

  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-2 rounded-2xl bg-[var(--surface-raised)] p-4">
          <span className="text-sm text-[var(--ink-muted)]">{r.label}</span>
          <span className="flex items-baseline gap-2">
            <span className="num text-lg text-[var(--ink-muted)]">
              {r.before}
              {r.suffix}
            </span>
            <ArrowRight className="size-4 text-[var(--ink-muted)]" aria-hidden />
            <span
              className="num text-3xl"
              style={{ color: r.now < r.before ? 'var(--palm)' : r.now > r.before ? 'var(--ember)' : 'var(--ink)' }}
            >
              {r.now}
              {r.suffix}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ── Handover plan ────────────────────────────────────────────────────────────────

function HandoverPlan({
  sim,
  plan,
  busy,
  onDraftPlan,
}: {
  sim: AbsenceResult
  plan: CreatedPlan | null
  busy: 'run' | 'plan' | null
  onDraftPlan: () => void
}) {
  const { nameOf, colorOf } = useMemberLookup()
  const recipients = plan ? [...new Set(plan.proposals.map((x) => nameOf(x.toId)))] : []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-sm text-[var(--ink-muted)]">
          Bayt suggests who could take each task and writes the steps. These are requests: nothing changes until the
          person accepts.
        </p>
        {!plan && (
          <button
            type="button"
            onClick={onDraftPlan}
            disabled={busy !== null || sim.failures.length === 0}
            className="flex items-center gap-2 rounded-full bg-[var(--sand)] px-5 py-2 text-sm font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-40"
          >
            {busy === 'plan' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ClipboardList className="size-3.5" aria-hidden />}
            Draft the handover plan
          </button>
        )}
      </div>

      {plan && (
        <>
          <p className="text-sm text-[var(--ink-muted)]">
            {plan.proposals.length === 0
              ? 'Nobody present can take these on without being overloaded. Ask someone outside the household.'
              : plan.created > 0
                ? `Sent ${plural(plan.created, 'request')} to ${recipients.join(' and ')}. They wait in the inbox until answered; use Viewing as in the top bar to answer for them.`
                : `These requests are already waiting for ${recipients.join(' and ')}.`}
            {plan.reworded && ' Steps were reworded by a model and checked against the facts.'}
            {plan.error && ' The wording step was unavailable, so the plain steps are shown.'}
          </p>

          <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
            {plan.entries.map((e) => {
              const done = !sim.failures.some((f) => f.key === e.key)
              return (
                <StaggerItem as="li" key={e.key} className="flex flex-col rounded-2xl bg-[var(--surface-raised)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <p className="text-base font-semibold text-[var(--ink)]">{e.title}</p>
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        done ? 'bg-[var(--palm)] text-[var(--bg)]' : e.toId ? 'bg-[var(--surface-high)] text-[var(--ink)]' : 'bg-[var(--ember-soft)] text-[var(--ember)]'
                      }`}
                    >
                      {!done && e.toId && <Avatar name={nameOf(e.toId)} color={colorOf(e.toId)} size="sm" className="!size-4 !text-[0.6rem]" />}
                      {done ? 'Covered now' : e.toId ? `Asked ${nameOf(e.toId)}` : 'Needs someone outside the family'}
                    </span>
                  </div>
                  <ol className="mt-3 flex flex-col gap-1.5 text-sm text-[var(--ink-muted)]">
                    {e.steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="num flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-high)] text-xs text-[var(--ink)]">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3">
                    <WhyPopover sources={e.sources} />
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        </>
      )}
    </div>
  )
}
