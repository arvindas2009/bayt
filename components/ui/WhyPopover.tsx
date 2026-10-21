'use client'

import { useCallback, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, FileText, HandHeart, Pill } from 'lucide-react'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { ResolvedSource } from '@/lib/evidence/resolve'
import type { SourceRef } from '@/types/agents'

const ICON = {
  event: CalendarDays,
  medication: Pill,
  obligation: FileText,
  handoff: HandHeart,
} as const

const TYPE_LABEL: Record<SourceRef['type'], string> = {
  event: 'Calendar event',
  medication: 'Medication',
  obligation: 'Obligation',
  handoff: 'Handoff',
}

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: ResolvedSource[] }

/**
 * "Why?": opens the records an insight was derived from. Sources are resolved on the server, which
 * drops ids that do not exist, so only real records are ever shown. Renders nothing without sources.
 */
export default function WhyPopover({
  sources,
  label = 'Why?',
  align = 'left',
}: {
  sources?: SourceRef[]
  label?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ status: 'idle' })
  const ref = useRef<HTMLSpanElement>(null)
  const { nameOf } = useMemberLookup()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  if (!sources || sources.length === 0) return null

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next || state.status === 'ready' || state.status === 'loading') return
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState({ status: 'ready', items: (await res.json()) as ResolvedSource[] })
    } catch {
      setState({ status: 'error' })
    }
  }

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="rounded-full px-2 py-0.5 text-sm text-[var(--sand-text)] underline decoration-[var(--line-strong)] underline-offset-4 transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
      >
        {label}
      </button>

      {/* Only phrasing elements (spans) below: the popover sits inline inside <p> text in several places. */}
      {open && (
        <span
          role="dialog"
          aria-label="Where this comes from"
          className={`absolute top-full z-40 mt-2 block w-80 max-w-[85vw] rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-4 text-left font-normal shadow-2xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <span className="mb-3 block text-sm text-[var(--ink-muted)]">Based on these records</span>

          {state.status === 'loading' && <span className="block text-sm text-[var(--ink-muted)]">Looking them up…</span>}
          {state.status === 'error' && (
            <span className="block text-sm text-[var(--ink-muted)]">Could not load the records. Try again.</span>
          )}
          {state.status === 'ready' && state.items.length === 0 && (
            <span className="block text-sm text-[var(--ink-muted)]">These records no longer exist.</span>
          )}
          {state.status === 'ready' && state.items.length > 0 && (
            <span role="list" className="flex flex-col gap-3">
              {state.items.map((s) => {
                const Icon = ICON[s.type]
                return (
                  <span role="listitem" key={`${s.type}:${s.id}`} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                    <span className="block min-w-0">
                      <span className="block text-sm leading-snug text-[var(--ink)]">{s.title}</span>
                      <span className="block text-sm text-[var(--ink-muted)]">
                        {TYPE_LABEL[s.type]}
                        {s.when && <> · <span className="num">{format(parseISO(s.when), 'EEE d MMM, HH:mm')}</span></>}
                        {s.ownerId && <> · {nameOf(s.ownerId)}</>}
                      </span>
                      {s.detail && <span className="mt-0.5 block text-sm text-[var(--ink-muted)]">{s.detail}</span>}
                    </span>
                  </span>
                )
              })}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
