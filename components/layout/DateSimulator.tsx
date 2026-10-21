'use client'

import { useCallback, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import { isDemoMode } from '@/lib/demo/mode'
import { getSimDate } from '@/lib/time/today'
import { useDismiss } from '@/lib/hooks/useDismiss'

const PRESETS = [
  { label: 'Ramadan', date: '2027-02-12' },
  { label: 'Eid al-Adha', date: '2027-05-14' },
  { label: 'Summer heat', date: '2027-07-15' },
  { label: 'Dust season', date: '2026-11-05' },
] as const

const ITEM =
  'w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]'

/** Demo-only: jump the whole app to another date. Reloads so every page recomputes from it. */
export default function DateSimulator() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  if (!isDemoMode) return null

  const sim = getSimDate()

  const apply = async (date: string | null) => {
    setBusy(true)
    try {
      const res = await fetch('/api/sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (res.ok) window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Simulate a date"
        className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
      >
        <CalendarClock className="size-3.5" aria-hidden />
        {sim ? format(sim, 'd MMM yyyy') : 'Simulate date'}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Simulate a date"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-3 shadow-2xl"
        >
          <p className="px-3 pb-1 text-xs text-[var(--ink-muted)]">Jump the whole app to another date</p>
          {PRESETS.map((p) => (
            <button key={p.label} disabled={busy} onClick={() => void apply(p.date)} className={ITEM}>
              {p.label} <span className="num text-[var(--ink-muted)]">· {format(new Date(`${p.date}T12:00:00`), 'd MMM yyyy')}</span>
            </button>
          ))}
          <label className="mt-1 block px-3 py-1 text-xs text-[var(--ink-muted)]">
            Pick a day
            <input
              type="date"
              defaultValue={sim ? format(sim, 'yyyy-MM-dd') : ''}
              disabled={busy}
              onChange={(e) => e.target.value && void apply(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--line-strong)] bg-[var(--bg)] px-2 py-1 text-sm text-[var(--ink)]"
            />
          </label>
          {sim && (
            <button disabled={busy} onClick={() => void apply(null)} className={`${ITEM} mt-1 text-[var(--sand-text)]`}>
              Back to today
            </button>
          )}
        </div>
      )}
    </div>
  )
}
