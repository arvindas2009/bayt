'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Lightbulb, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import type { CalendarConflict } from '@/types'
import { useFamilyStore } from '@/store/family-store'

// ─── Member colour map ────────────────────────────────────────────────────────

const MEMBER_COLOR: Record<string, string> = {
  Salem:  '#3D7FFF',
  Fatima: '#cfbcff',
  Layla:  '#2ECC8A',
  Khalid: '#e7c365',
  Aisha:  '#e87040',
}

function memberColor(name: string) {
  return MEMBER_COLOR[name.split(' ')[0]] ?? 'var(--primary)'
}

// ─── Event block ──────────────────────────────────────────────────────────────

function EventBlock({ name }: { name: string }) {
  const color     = memberColor(name)
  const initial   = name.trim()[0]?.toUpperCase() ?? '?'
  const firstName = name.split(' ')[0]

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-3 p-3"
      style={{ background: 'var(--surface-container)', borderLeft: `3px solid ${color}` }}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold"
        style={{ background: color, color: '#0a0a0a' }}
      >
        {initial}
      </div>
      <p className="truncate text-sm font-medium text-[var(--on-surface)]">{firstName}</p>
    </div>
  )
}

// ─── Single conflict card ─────────────────────────────────────────────────────

function ConflictCard({
  conflict,
  onAccept,
}: {
  conflict: CalendarConflict
  onAccept: () => void
}) {
  const dateLabel = (() => {
    try { return format(parseISO(conflict.date), 'EEE · d MMM') }
    catch { return conflict.date.slice(0, 10) }
  })()

  const [memberA, memberB, ...overflow] = conflict.members

  return (
    <div className="py-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
        {dateLabel}
      </p>

      <div className="mb-4 flex gap-2">
        {memberA && <EventBlock name={memberA} />}
        {memberB && <EventBlock name={memberB} />}
        {overflow.length > 0 && (
          <div
            className="flex shrink-0 items-center px-3 font-mono text-xs text-[var(--on-surface-variant)]"
            style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}
          >
            +{overflow.length}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--error)]" />
        <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]">
          {conflict.conflict}
        </p>
      </div>

      <div
        className="mb-4 flex items-start gap-2.5 p-3"
        style={{
          background: 'var(--surface-container)',
          borderLeft: '2px solid var(--primary)',
        }}
      >
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[var(--primary)]" />
        <p className="text-sm leading-relaxed text-[var(--on-surface)]">
          {conflict.suggestion}
        </p>
      </div>

      <button
        onClick={onAccept}
        className="flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
        style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
      >
        <Check className="size-3" />
        Accept suggestion
      </button>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="h-px w-full" style={{ background: 'var(--outline-variant)', opacity: 0.35 }} />
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="mb-4 flex size-14 items-center justify-center"
        style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container)' }}
      >
        <CheckCircle2 className="size-6 text-green-400" />
      </div>
      <p className="text-base font-medium text-[var(--on-surface)]">
        No conflicts detected this week.
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        Nice.
      </p>
    </div>
  )
}

// ─── CalendarConflicts ────────────────────────────────────────────────────────

interface Props {
  conflicts: CalendarConflict[]
}

export default function CalendarConflicts({ conflicts }: Props) {
  const { resolveConflictByDate } = useFamilyStore()
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const visible = conflicts.filter((_, i) => !dismissed.has(i))

  function handleAccept(conflict: CalendarConflict, index: number) {
    // Dismiss from the list
    setDismissed((prev) => new Set(prev).add(index))

    // Clear conflict badges from the family agenda for the involved events
    resolveConflictByDate(conflict.date, conflict.members)

    toast.success('Conflict resolved', {
      description: 'Suggestion accepted. Update the calendar to apply the change.',
    })
  }

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      <header className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Calendar Conflicts
        </span>
        {visible.length > 0 && (
          <span
            className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
            style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
          >
            {visible.length} found
          </span>
        )}
      </header>

      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <ul>
          {conflicts.map((c, i) => {
            if (dismissed.has(i)) return null
            const visibleIndex = visible.indexOf(c)
            return (
              <li key={i}>
                <ConflictCard
                  conflict={c}
                  onAccept={() => handleAccept(c, i)}
                />
                {visibleIndex < visible.length - 1 && <Divider />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
