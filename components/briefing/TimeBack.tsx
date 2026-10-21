'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Hourglass, Quote } from 'lucide-react'
import MemoryComposer from '@/components/briefing/MemoryComposer'
import { Avatar, CARD, IconBadge } from '@/components/ui/Card'
import AnimatedBar from '@/components/motion/AnimatedBar'
import CountUp from '@/components/motion/CountUp'
import { Reveal } from '@/components/motion/Reveal'
import type { BriefingData } from '@/types'

const minutesLabel = (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} h` : `${m} min`)

/**
 * The Time Dividend and the Memory Vault side by side: the time Bayt gave back, and one thing
 * someone in the family once said, as a prompt for how to spend it. The hours are computed from
 * what Bayt actually did; the quote is stored word for word, never written by a model.
 */
export default function TimeBack({ briefing, large }: { briefing: BriefingData; large: boolean }) {
  const memory = briefing.memoryOfTheDay
  const lines = briefing.dividendLines ?? []
  const [open, setOpen] = useState(false)
  const longest = Math.max(1, ...lines.map((l) => l.minutes))

  return (
    <section aria-labelledby="timeback-title" className="grid gap-4 lg:grid-cols-5">
      {/* The number */}
      <Reveal className={`${CARD} flex flex-col gap-4 lg:col-span-2`}>
        <div className="flex items-center gap-3">
          <IconBadge icon={Hourglass} tone="zest" />
          <h2 id="timeback-title" className="text-sm font-semibold text-[var(--ink-muted)]">
            Time given back
          </h2>
        </div>
        <p className="flex items-baseline gap-3 text-[var(--ink)]">
          <CountUp value={briefing.timeSavedHours} className="font-display text-8xl text-[var(--sand-text)]" />
          <span className="font-display text-3xl">hours</span>
        </p>
        <p className={`text-[var(--ink-muted)] ${large ? 'text-lg' : 'text-sm'}`}>of coordination Bayt took off the family this week.</p>

        {lines.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
            >
              How this is counted
              <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <ul className="mt-4 flex flex-col gap-3">
                    {lines.map((l, i) => (
                      <li key={l.label} className="text-sm">
                        <div className="flex items-baseline justify-between gap-3 text-[var(--ink)]">
                          <span>
                            <span className="num">{l.count}</span> {l.label.toLowerCase()}
                          </span>
                          <span className="num text-[var(--ink-muted)]">{minutesLabel(l.minutes)}</span>
                        </div>
                        <AnimatedBar value={l.minutes / longest} color="var(--zest)" className="mt-1.5 h-1.5" delay={i * 0.08} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[var(--ink-muted)]">Each count is multiplied by a planning assumption for how long that task takes by hand.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Reveal>

      {/* The memory */}
      <Reveal delay={0.08} className={`${CARD} relative flex flex-col gap-5 overflow-hidden lg:col-span-3`}>
        <Quote aria-hidden className="pointer-events-none absolute -right-4 -top-6 size-40 rotate-180 text-[var(--dusk)] opacity-15" />
        <div className="flex items-center gap-3">
          <IconBadge icon={Quote} tone="dusk" />
          <h3 className="text-sm font-semibold text-[var(--ink-muted)]">{memory ? 'A way to spend some of it' : 'From the Memory Vault'}</h3>
        </div>
        {memory ? (
          <figure className="relative flex flex-1 flex-col gap-5">
            <blockquote className={`font-statement leading-snug text-[var(--ink)] ${large ? 'text-3xl' : 'text-2xl'}`}>
              &ldquo;{memory.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3">
              <Avatar name={memory.attribution} color="var(--zest)" size="md" />
              <span className="text-sm">
                <span className="block font-semibold text-[var(--ink)]">{memory.attribution}</span>
                <span className="text-[var(--ink-muted)]">{format(parseISO(memory.dateCaptured), 'd MMMM yyyy')}</span>
              </span>
            </figcaption>
          </figure>
        ) : (
          <p className="text-base text-[var(--ink-muted)]">Nothing captured yet. Save something someone said, word for word.</p>
        )}
        <MemoryComposer />
      </Reveal>
    </section>
  )
}
