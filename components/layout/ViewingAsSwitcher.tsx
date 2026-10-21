'use client'

import { useCallback, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useViewingAs } from '@/lib/hooks/useViewingAs'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { useDismiss } from '@/lib/hooks/useDismiss'

/** Global "Viewing as" control: every page reads the same perspective, so handoffs work anywhere. */
export default function ViewingAsSwitcher() {
  const { member, setViewingAs } = useViewingAs()
  const { members, colorOf } = useMemberLookup()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  if (!member) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] py-1 pl-1 pr-3 text-sm transition-colors hover:bg-[var(--surface-raised)]"
      >
        <span
          className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-[var(--on-member)]"
          style={{ background: colorOf(member.id) }}
          aria-hidden
        >
          {member.name[0]}
        </span>
        <span className="hidden text-[var(--ink-muted)] sm:inline">Viewing as</span>
        <span className="text-[var(--ink)]">{member.name}</span>
        <ChevronDown className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Viewing as"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl"
        >
          {members.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === member.id}>
              <button
                onClick={() => {
                  setViewingAs(m.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-high)]"
              >
                <span
                  className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-[var(--on-member)]"
                  style={{ background: colorOf(m.id) }}
                  aria-hidden
                >
                  {m.name[0]}
                </span>
                <span className="flex-1">{m.name}</span>
                {m.id === member.id && <Check className="size-4 text-[var(--sand-text)]" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
