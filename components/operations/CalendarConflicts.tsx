'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, Lightbulb, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { CalendarConflict } from '@/types'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import WhyPopover from '@/components/ui/WhyPopover'

function dayLabel(iso: string): string {
  try {
    return format(parseISO(iso), 'EEEE d MMMM')
  } catch {
    return iso.slice(0, 10)
  }
}

/** Clashes in the calendar, with the people involved, a suggestion, and the events behind it. */
export default function CalendarConflicts({ conflicts }: { conflicts: CalendarConflict[] }) {
  const resolveConflictByDate = useFamilyStore((s) => s.resolveConflictByDate)
  const { nameOf, colorOf } = useMemberLookup()
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const visible = conflicts.map((c, i) => ({ c, i })).filter(({ i }) => !dismissed.has(i))

  const accept = (c: CalendarConflict, i: number) => {
    setDismissed((prev) => new Set(prev).add(i))
    resolveConflictByDate(c.date, c.members)
    toast.success('Marked as sorted', { description: 'Change the event in your calendar to apply the suggestion.' })
  }

  return (
    <section aria-labelledby="conflicts-title">
      <h2 id="conflicts-title" className="font-display text-2xl text-[var(--ink)]">
        {visible.length === 0 ? 'No clashes this week' : visible.length === 1 ? 'One clash to sort out' : `${visible.length} clashes to sort out`}
      </h2>

      {visible.length === 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <CheckCircle2 className="size-4 text-[var(--palm)]" aria-hidden />
          Nobody is expected in two places at once.
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {visible.map(({ c, i }, n) => (
            <motion.li
              key={i}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { delay: n * 0.06 } }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-soft)] text-[var(--ember)]">
                  <TriangleAlert className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--ink-muted)]">{dayLabel(c.date)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    {c.members.map((id) => (
                      <span key={id} className="flex items-center gap-1.5 rounded-full bg-[var(--surface-high)] px-2.5 py-0.5 text-sm text-[var(--ink)]">
                        <span className="size-2 rounded-full" style={{ background: colorOf(id) }} aria-hidden />
                        {nameOf(id)}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-base leading-relaxed text-[var(--ink)]">
                {c.conflict} <WhyPopover sources={c.sources} />
              </p>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--sand-text)]" aria-hidden />
                {c.suggestion}
              </p>
              <button
                onClick={() => accept(c, i)}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-[var(--sand)] px-4 py-1.5 text-sm font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]"
              >
                <Check className="size-3.5" aria-hidden />
                Mark as sorted
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
