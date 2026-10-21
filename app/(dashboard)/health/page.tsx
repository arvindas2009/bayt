'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { ArrowRight, CalendarHeart, Pill, RefreshCw, Users } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { usePageBusy } from '@/lib/hooks/usePageBusy'
import { statusOf } from '@/lib/health/status'
import { APPOINTMENT_DAYS, unbackedCount, upcomingAppointments } from '@/lib/health/appointments'
import { BUTTON_SECONDARY } from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'
import PinButton from '@/components/pins/PinButton'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Avatar, CARD, CARD_HOVER } from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import FamilyPatterns from '@/components/health/FamilyPatterns'
import MedicationList from '@/components/health/MedicationList'
import StatusChip from '@/components/health/StatusChip'
import { getToday } from '@/lib/time/today'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function HealthPage() {
  const { agentStatuses, agentOutputs, agentMeta, runAgent } = useAgentStore()
  const family = useFamilyStore((s) => s.family)
  const { nameOf, colorOf } = useMemberLookup()
  const status = agentStatuses.health
  const output = agentOutputs.health
  const thinking = status === 'thinking'
  const [tab, setTab] = useState('appointments')

  useEffect(() => {
    // Served from today's stored run unless it is stale, so opening the page does not call a model.
    if (!output) runAgent('health')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  usePageBusy(!family || (!output && thinking))

  const members = useMemo(() => family?.members ?? [], [family])

  const medications = useMemo(() => members.flatMap((m) => m.medications), [members])
  const unbacked = unbackedCount(members)

  const appointments = useMemo(() => upcomingAppointments(members, getToday()), [members])

  const summaryOf = (id: string) => output?.memberSummaries.find((s) => s.memberId === id)

  const dayLabel = (iso: string) => {
    const d = parseISO(iso)
    return isSameDay(d, getToday()) ? 'Today' : isSameDay(d, addDays(getToday(), 1)) ? 'Tomorrow' : format(d, 'EEEE')
  }

  const pinBar = (id: 'appointments' | 'medications') => (
    <div className="mb-4 flex justify-end">
      <PinButton id={id} />
    </div>
  )

  const appointmentsList =
    appointments.length === 0 ? (
      <p className="text-base text-[var(--ink-muted)]">No appointments booked in the next {APPOINTMENT_DAYS} days.</p>
    ) : (
      <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
        {appointments.map((e) => (
          <StaggerItem as="li" key={e.id} className="flex gap-4 rounded-2xl bg-[var(--surface-raised)] p-4 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex w-14 shrink-0 flex-col items-center self-start rounded-2xl bg-[var(--surface)] py-2">
              <span className="font-display text-2xl text-[var(--ink)]">{format(parseISO(e.date), 'd')}</span>
              <span className="text-xs text-[var(--ink-muted)]">{format(parseISO(e.date), 'MMM')}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-[var(--ink)]">{e.title}</p>
              <p className="text-sm text-[var(--ink-muted)]">
                {dayLabel(e.date)}, <span className="num">{format(parseISO(e.date), 'HH:mm')}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink)]">
                <span className="flex items-center gap-1.5">
                  <Avatar name={nameOf(e.who)} color={colorOf(e.who)} size="sm" />
                  For {nameOf(e.who)}
                </span>
                {e.ownerId && e.ownerId !== e.who && (
                  <span className="flex items-center gap-1.5">
                    <Avatar name={nameOf(e.ownerId)} color={colorOf(e.ownerId)} size="sm" />
                    Taken by {nameOf(e.ownerId)}
                  </span>
                )}
              </div>
            </div>
            {e.conflict && (
              <span className="h-fit shrink-0 rounded-full bg-[var(--ember-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ember)]">Clashes</span>
            )}
          </StaggerItem>
        ))}
      </Stagger>
    )
  const appointmentsPanel = (
    <>
      {pinBar('appointments')}
      {appointmentsList}
    </>
  )

  const medicationsPanel = (
    <div className="flex flex-col gap-4">
      {pinBar('medications')}
      {unbacked > 0 && (
        <p className="text-sm font-semibold text-[var(--ember)]">
          {unbacked === 1 ? 'One medication has' : `${unbacked} medications have`} only one person who can give {unbacked === 1 ? 'it' : 'them'}.
        </p>
      )}
      <MedicationList medications={medications} showPatient />
    </div>
  )

  const patternsPanel = (
    <div className="flex flex-col gap-4">
      {!output && status !== 'idle' && <CardSkeleton className="h-[200px]" />}
      {!output && status === 'idle' && (
        <p className="text-base text-[var(--ink-muted)]">
          The family patterns could not be worked out{agentMeta.health?.error ? `: ${agentMeta.health.error}` : '.'}
        </p>
      )}
      {output && (
        <>
          {output._mock && (
            <p className="text-sm text-[var(--ink-muted)]">
              Written on this computer from the records. The model was unavailable{output._error ? `: ${output._error}` : '.'}
            </p>
          )}
          <FamilyPatterns patterns={output.familyPatterns} />
        </>
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-10 pb-20 pt-8">
      <PageHeader
        shortTitle="Health"
        title="Health"
        subtitle={<p className="text-base text-[var(--ink-muted)]">Choose a person to see their medications, results and what to watch.</p>}
        actions={
          <button onClick={() => runAgent('health', { force: true })} disabled={thinking} className={BUTTON_SECONDARY}>
            <RefreshCw className={`size-3.5 ${thinking ? 'animate-spin' : ''}`} aria-hidden />
            {thinking ? 'Looking…' : 'Look again'}
          </button>
        }
      />

      <section aria-labelledby="people-title">
        <h2 id="people-title" className="sr-only">Everyone</h2>
        {!family ? (
          <CardSkeleton className="h-[220px]" />
        ) : (
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {members.map((m) => {
              const s = statusOf(m)
              const flag = summaryOf(m.id)?.topFlags[0] ?? m.healthProfile?.riskFlags[0]
              const meds = m.medications.length
              const appts = appointments.filter((e) => e.who === m.id).length
              return (
                <StaggerItem as="li" key={m.id}>
                  <Link
                    href={`/health/${m.id}`}
                    aria-label={`${m.name}: open their health page`}
                    className={`${CARD} ${CARD_HOVER} group flex h-full flex-col gap-4 !p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]`}
                  >
                    <div className="flex items-start justify-between">
                      <Avatar name={m.name} color={colorOf(m.id)} size="lg" className="transition-transform duration-300 group-hover:scale-110" />
                      <ArrowRight className="size-5 -translate-x-1 text-[var(--ink-muted)] transition-all duration-300 group-hover:translate-x-0 group-hover:text-[var(--ink)]" aria-hidden />
                    </div>
                    <div>
                      <p className="font-display text-3xl text-[var(--ink)]">{m.name}</p>
                      <p className="text-sm capitalize text-[var(--ink-muted)]">
                        {m.role}, <span className="num">{m.age}</span>
                      </p>
                    </div>
                    <StatusChip status={s} />
                    {flag && <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">{flag}</p>}
                    <div className="mt-auto flex gap-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-muted)]">
                      <span className="flex items-center gap-1">
                        <Pill className="size-3.5" aria-hidden />
                        {plural(meds, 'medication')}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarHeart className="size-3.5" aria-hidden />
                        {plural(appts, 'visit')}
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              )
            })}
          </Stagger>
        )}
      </section>

      <Reveal className={CARD}>
        <Tabs
          label="Across the family"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'appointments', label: `Next ${APPOINTMENT_DAYS} days`, icon: CalendarHeart, count: appointments.length, content: appointmentsPanel },
            { id: 'medications', label: 'Medications', icon: Pill, count: medications.length, content: medicationsPanel },
            { id: 'patterns', label: 'Family patterns', icon: Users, count: output?.familyPatterns.length, content: patternsPanel },
          ]}
        />
      </Reveal>
    </div>
  )
}
