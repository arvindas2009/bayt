'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { CalendarClock, Clock, HeartPulse, Info, Orbit, Target, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import WhyPopover from '@/components/ui/WhyPopover'
import Highlight from '@/components/ui/Highlight'
import { Avatar, CARD, CARD_HOVER, IconBadge } from '@/components/ui/Card'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { getToday } from '@/lib/time/today'
import ReadAloud from './ReadAloud'
import type { AgentName, InsightSeverity, MemberBriefing } from '@/types/agents'

// Each agent has a word, an icon and a colour, so the source never depends on colour alone.
const AGENT: Record<AgentName, { word: string; icon: LucideIcon; tone: 'dusk' | 'ember' | 'palm' | 'zest' }> = {
  operations: { word: 'Operations', icon: CalendarClock, tone: 'dusk' },
  health: { word: 'Health', icon: HeartPulse, tone: 'ember' },
  connection: { word: 'Connection', icon: Users, tone: 'palm' },
  caregiver: { word: 'Load', icon: Orbit, tone: 'zest' },
}

const SEVERITY: Record<InsightSeverity, { word: string; icon: LucideIcon; className: string }> = {
  critical: { word: 'Urgent', icon: TriangleAlert, className: 'bg-[var(--ember)] text-[var(--on-ember)]' },
  warning: { word: 'Needs doing', icon: Clock, className: 'bg-[var(--zest)] text-[var(--on-zest)]' },
  info: { word: 'Good to know', icon: Info, className: 'bg-[var(--surface-high)] text-[var(--ink)]' },
}

const MAX_INSIGHTS = 3

const whenLabel = (iso: string) => {
  const d = parseISO(iso)
  const time = format(d, 'HH:mm')
  const day = isSameDay(d, getToday()) ? 'Today' : format(d, 'EEE d MMM')
  // A midnight time on a due date is a whole-day deadline, not an appointment.
  return time === '00:00' ? day : `${day} · ${time}`
}

/**
 * The one thing to do today, split into its parts (how urgent, when, who, what, and what happens
 * if nobody does it) instead of one paragraph, followed by at most three other things.
 */
export default function PriorityHero({ briefing, large }: { briefing: MemberBriefing; large: boolean }) {
  const { nameOf, colorOf, known } = useMemberLookup()
  const p = briefing.priority
  const sev = SEVERITY[p?.severity ?? 'info']
  const SevIcon = sev.icon
  const people = (p?.personIds ?? []).filter(known)

  const others = [...briefing.insights]
    .sort((a, b) => a.priority - b.priority)
    // Connection ideas have their own section on the page.
    .filter((i) => i.agent !== 'connection' && i.text.trim() !== briefing.oneAction.trim())
    .slice(0, MAX_INSIGHTS)

  return (
    <div className="flex flex-col gap-4">
      <Reveal as="section" aria-labelledby="priority-title" className={`${CARD} relative overflow-hidden !p-0`}>
        {/* A soft lime glow in the corner marks this as the one card to read first. */}
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--sand)] opacity-15 blur-3xl" />

        {/* Meta: what kind of thing, when, who */}
        <div className="relative flex flex-wrap items-center gap-2.5 px-6 pt-6">
          <IconBadge icon={Target} tone="sand" />
          <h2 id="priority-title" className="mr-1 text-sm font-semibold text-[var(--ink)]">
            Today&rsquo;s priority
          </h2>
          {p && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.className}`}>
              <SevIcon className="size-3.5" aria-hidden />
              {sev.word}
            </span>
          )}
          {p?.at && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dusk)] px-2.5 py-1 text-xs font-semibold text-[var(--on-dusk)]">
              <CalendarClock className="size-3.5" aria-hidden />
              {whenLabel(p.at)}
            </span>
          )}
          {people.length > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-raised)] py-1 pl-1 pr-3 text-xs font-semibold text-[var(--ink)]">
              <span className="flex -space-x-1.5">
                {people.map((id) => (
                  <Avatar key={id} name={nameOf(id)} color={colorOf(id)} size="sm" className="ring-2 ring-[var(--surface-raised)]" />
                ))}
              </span>
              {people.map(nameOf).join(', ')}
            </span>
          )}
        </div>

        {/* What to do */}
        <p className={`font-statement relative max-w-4xl px-6 pb-6 pt-4 leading-snug text-[var(--ink)] ${large ? 'text-4xl' : 'text-3xl'}`}>
          <Highlight text={briefing.oneAction} />
        </p>

        {/* What happens otherwise, and the evidence */}
        {(p?.consequence || briefing.textAr) && (
          <div className="relative grid border-t border-[var(--line)] md:grid-cols-[minmax(0,1fr)_auto]">
            {p?.consequence && (
              <div className="flex gap-3 bg-[var(--ember-soft)] px-6 py-4">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--ember)]" aria-hidden />
                <div>
                  <p className="text-xs font-semibold text-[var(--ember)]">If nothing is done</p>
                  <p className={`mt-0.5 text-[var(--ink)] ${large ? 'text-lg' : 'text-base'}`}>
                    <Highlight text={p.consequence} />
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 px-6 py-4 md:border-l md:border-[var(--line)]">
              {p && <WhyPopover sources={p.sources} />}
              {briefing.textAr && <ReadAloud textAr={briefing.textAr} />}
            </div>
          </div>
        )}
      </Reveal>

      {others.length > 0 && (
        <section aria-labelledby="also-title">
          <h2 id="also-title" className="sr-only">
            Also worth knowing
          </h2>
          <Stagger as="ol" className="grid gap-4 md:grid-cols-3">
            {others.map((i, n) => {
              const a = AGENT[i.agent]
              return (
                <StaggerItem
                  as="li"
                  key={n}
                  className={`${CARD} ${CARD_HOVER} relative flex flex-col gap-3 !p-5`}
                >
                  {/* Tinted by the agent it came from; the word label carries the same information. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-3xl"
                    style={{ background: `color-mix(in oklab, var(--${a.tone}) 9%, transparent)` }}
                  />
                  <div className="relative flex items-center gap-2.5">
                    <IconBadge icon={a.icon} tone={a.tone} className="!size-8 !rounded-xl" />
                    <span className="text-xs font-semibold text-[var(--ink)]">{a.word}</span>
                  </div>
                  {/* Keyed by text: fades when the model's wording replaces the plain version. */}
                  <motion.p
                    key={i.text}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`relative leading-relaxed text-[var(--ink)] ${large ? 'text-lg' : 'text-sm'}`}
                  >
                    <Highlight text={i.text} />
                  </motion.p>
                </StaggerItem>
              )
            })}
          </Stagger>
        </section>
      )}
    </div>
  )
}
