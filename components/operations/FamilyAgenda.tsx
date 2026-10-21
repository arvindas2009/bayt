'use client'

import { useMemo } from 'react'
import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { getToday } from '@/lib/time/today'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'

const MAX_EVENTS = 14

/** The next events for everyone, grouped by day. A clash shows in words, not just colour. */
export default function FamilyAgenda() {
  const family = useFamilyStore((s) => s.family)
  const { nameOf, colorOf } = useMemberLookup()

  const days = useMemo(() => {
    const today = startOfDay(getToday())
    const upcoming = (family?.members ?? [])
      .flatMap((m) => m.calendarEvents.map((e) => ({ ...e, who: m.id })))
      .filter((e) => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, MAX_EVENTS)
    const grouped = new Map<string, typeof upcoming>()
    for (const e of upcoming) {
      const key = format(parseISO(e.date), 'yyyy-MM-dd')
      grouped.set(key, [...(grouped.get(key) ?? []), e])
    }
    return [...grouped.entries()]
  }, [family])

  if (!family) return null

  const label = (key: string) => {
    const d = parseISO(key)
    return isSameDay(d, getToday()) ? 'Today' : isSameDay(d, addDays(getToday(), 1)) ? 'Tomorrow' : format(d, 'EEEE d MMMM')
  }

  return (
    <section aria-labelledby="agenda-title">
      <h2 id="agenda-title" className="font-display text-2xl text-[var(--ink)]">Coming up</h2>
      {days.length === 0 ? (
        <p className="mt-3 text-base text-[var(--ink-muted)]">Nothing on the calendar.</p>
      ) : (
        <Stagger className="mt-5 flex flex-col gap-5">
          {days.map(([key, events]) => (
            <StaggerItem key={key} className="flex gap-4">
              {/* Date tile */}
              <div className="flex w-14 shrink-0 flex-col items-center self-start rounded-2xl bg-[var(--surface-raised)] py-2">
                <span className="font-display text-2xl text-[var(--ink)]">{format(parseISO(key), 'd')}</span>
                <span className="text-xs text-[var(--ink-muted)]">{format(parseISO(key), 'MMM')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--ink-muted)]">{label(key)}</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--surface-raised)]"
                    >
                      <span className="num w-12 shrink-0 text-sm text-[var(--ink-muted)]">{format(parseISO(e.date), 'HH:mm')}</span>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(e.who) }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm leading-snug text-[var(--ink)]">{e.title}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{nameOf(e.who)}</p>
                      </div>
                      {e.conflict && (
                        <span className="shrink-0 rounded-full bg-[var(--ember-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ember)]">Clashes</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  )
}
