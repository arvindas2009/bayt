'use client'

import { use, useEffect } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, Eye, FlaskConical, Footprints, HeartPulse, Moon, Pill, Users } from 'lucide-react'
import { useFamilyStore } from '@/store/family-store'
import { useAgentStore } from '@/store/agent-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { statusOf } from '@/lib/health/status'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Avatar, CARD, IconBadge } from '@/components/ui/Card'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import FamilyPatterns from '@/components/health/FamilyPatterns'
import LabResultsTable from '@/components/health/LabResultsTable'
import MedicationList from '@/components/health/MedicationList'
import StatusChip from '@/components/health/StatusChip'

function SectionTitle({ id, icon, tone, children }: { id: string; icon: typeof Pill; tone: 'sand' | 'ember' | 'dusk' | 'zest' | 'palm' | 'muted'; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <IconBadge icon={icon} tone={tone} />
      <h2 id={id} className="font-display text-2xl text-[var(--ink)]">{children}</h2>
    </div>
  )
}

export default function MemberHealthPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params)
  const family = useFamilyStore((s) => s.family)
  // Select the stored array itself: a selector that builds a new [] each render never settles.
  const healthOutput = useAgentStore((s) => s.agentOutputs.health)
  const runAgent = useAgentStore((s) => s.runAgent)
  const patterns = healthOutput?.familyPatterns
  const { colorOf } = useMemberLookup()

  useEffect(() => {
    // Opened by link: make sure the family patterns are loaded (served from today's stored run).
    if (!healthOutput) runAgent('health')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const back = (
    <Link
      href="/health"
      className="mb-4 flex w-fit items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Everyone
    </Link>
  )

  if (!family) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-10 pt-8">
        <CardSkeleton className="h-[180px]" />
        <CardSkeleton className="h-[240px]" />
      </div>
    )
  }

  const member = family.members.find((m) => m.id === memberId)
  if (!member) {
    return (
      <div className="mx-auto w-full max-w-5xl px-10 pt-8">
        {back}
        <h1 className="font-display text-4xl text-[var(--ink)]">We could not find that person</h1>
      </div>
    )
  }

  const profile = member.healthProfile
  const wearable = profile?.wearableData
  const conditions = profile?.conditions ?? []
  const flags = profile?.riskFlags ?? []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-10 pb-20 pt-8">
      <Reveal as="header">
        {back}
        <div className={`${CARD} flex flex-wrap items-center gap-6`}>
          <Avatar name={member.name} color={colorOf(member.id)} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-5xl md:text-6xl text-[var(--ink)]">{member.name}</h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              <span className="capitalize">{member.role}</span>, <span className="num">{member.age}</span> years old
            </p>
            {conditions.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Conditions">
                {conditions.map((c) => (
                  <li key={c} className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--ink)]">{c}</li>
                ))}
              </ul>
            )}
          </div>
          <StatusChip status={statusOf(member)} />
        </div>
      </Reveal>

      {flags.length > 0 && (
        <Reveal as="section" aria-labelledby="flags-title" className={CARD}>
          <SectionTitle id="flags-title" icon={Eye} tone="zest">To keep an eye on</SectionTitle>
          <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
            {flags.map((f) => (
              <StaggerItem as="li" key={f} className="flex items-start gap-3 rounded-2xl bg-[var(--surface-raised)] p-4 text-sm leading-relaxed text-[var(--ink)]">
                <Activity className="mt-0.5 size-4 shrink-0 text-[var(--ember)]" aria-hidden />
                {f}
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
      )}

      <Reveal as="section" aria-labelledby="labs-title" className={CARD}>
        <SectionTitle id="labs-title" icon={FlaskConical} tone="palm">Lab results</SectionTitle>
        <LabResultsTable labResults={profile?.lastLabResults ?? []} />
      </Reveal>

      <Reveal as="section" aria-labelledby="meds-title" className={CARD}>
        <SectionTitle id="meds-title" icon={Pill} tone="dusk">Medications</SectionTitle>
        <MedicationList medications={member.medications} />
      </Reveal>

      <Reveal as="section" aria-labelledby="patterns-title" className={CARD}>
        <SectionTitle id="patterns-title" icon={Users} tone="sand">Family patterns that include {member.name}</SectionTitle>
        {patterns ? (
          <FamilyPatterns patterns={patterns} memberId={member.id} />
        ) : (
          <p className="py-3 text-base text-[var(--ink-muted)]">Looking for patterns…</p>
        )}
      </Reveal>

      {wearable && (
        <Reveal as="section" aria-labelledby="device-title" className={CARD}>
          <SectionTitle id="device-title" icon={HeartPulse} tone="muted">Wearable</SectionTitle>
          <p className="-mt-2 text-sm text-[var(--ink-muted)]">
            Simulated sample figures. Bayt is not connected to a wearable, and nothing else on this page uses these numbers.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Resting heart rate', value: wearable.avgHeartRate, unit: 'bpm', icon: HeartPulse },
              { label: 'Sleep', value: wearable.sleepHours, unit: 'hours', icon: Moon },
              { label: 'Steps a day', value: wearable.steps.toLocaleString('en-GB'), unit: '', icon: Footprints },
            ].map((d) => (
              <div key={d.label} className="rounded-2xl bg-[var(--surface-raised)] p-4">
                <dt className="flex items-center gap-1.5 text-sm text-[var(--ink-muted)]">
                  <d.icon className="size-4" aria-hidden />
                  {d.label}
                </dt>
                <dd className="mt-2 text-[var(--ink)]">
                  <span className="num text-2xl">{d.value}</span> <span className="text-sm text-[var(--ink-muted)]">{d.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      )}
    </div>
  )
}
