'use client'

import { useFamilyStore } from '@/store/family-store'
import { format, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { Calendar } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  Health:           'var(--tertiary)',
  Medical:          'var(--error)',
  Education:        'var(--primary)',
  Work:             'var(--secondary)',
  Family:           '#86efac',
  Social:           '#fbbf24',
  Extracurricular:  'var(--primary)',
  Caregiving:       '#c4b5fd',
  Travel:           '#67e8f9',
  Chores:           'var(--on-surface-variant)',
}

export default function FamilyAgenda() {
  const { family } = useFamilyStore()

  if (!family) return null

  const today = startOfDay(new Date())

  const allEvents = family.members.flatMap((member) =>
    (member.calendarEvents || []).map((event) => ({
      ...event,
      memberName: member.name,
    }))
  )

  const upcoming = allEvents
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 20)

  // Group by day
  const grouped: Record<string, typeof upcoming> = {}
  for (const event of upcoming) {
    const key = format(parseISO(event.date), 'yyyy-MM-dd')
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(event)
  }

  const dayKeys = Object.keys(grouped).sort()

  function dayLabel(key: string) {
    const d = parseISO(key)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  }

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6 flex flex-col"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <header className="mb-5 flex items-center gap-2">
        <Calendar className="size-4 text-[var(--primary)]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Upcoming Events
        </span>
      </header>

      {dayKeys.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--on-surface-variant)] py-6">
          No upcoming events.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {dayKeys.map((key) => (
            <div key={key}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-2">
                {dayLabel(key)}
              </p>
              <div className="flex flex-col gap-2">
                {grouped[key].map((event) => {
                  const dotColor = CATEGORY_COLORS[event.category] ?? 'var(--on-surface-variant)'
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                      style={{
                        background: event.conflict
                          ? 'rgba(255,180,171,0.06)'
                          : 'var(--surface-container-high)',
                        border: event.conflict
                          ? '1px solid rgba(255,180,171,0.25)'
                          : '1px solid var(--outline-variant)',
                      }}
                    >
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ background: dotColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--on-surface)] truncate">
                          {event.title}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--on-surface-variant)]">
                          {format(parseISO(event.date), 'HH:mm')} · {event.memberName}
                        </p>
                      </div>
                      {event.conflict && (
                        <span
                          className="shrink-0 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5"
                          style={{ background: 'rgba(255,180,171,0.15)', color: 'var(--error)', border: '1px solid rgba(255,180,171,0.3)' }}
                        >
                          Conflict
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
