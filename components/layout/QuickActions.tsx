'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarPlus, FileInput, Plus, ShieldAlert, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { useDismiss } from '@/lib/hooks/useDismiss'
import AddEventModal from '@/components/calendar/AddEventModal'

interface Item {
  label: string
  hint: string
  icon: LucideIcon
  tone: string
  run: () => void
}

/** The "+" in the top bar: the jobs people come back for, reachable from every page. */
export default function QuickActions() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const go = (href: string) => () => {
    setOpen(false)
    router.push(href)
  }

  const items: Item[] = [
    { label: 'Add an event', hint: 'Put it on the family calendar', icon: CalendarPlus, tone: 'bg-[var(--sand)] text-[var(--on-sand)]', run: () => { setOpen(false); setAdding(true) } },
    { label: 'Drop a document', hint: 'A letter, a bill, a school note', icon: FileInput, tone: 'bg-[var(--dusk)] text-[var(--on-dusk)]', run: go('/operations?tab=inbox') },
    { label: 'Run a stress test', hint: 'What breaks if someone is away', icon: ShieldAlert, tone: 'bg-[var(--ember)] text-[var(--on-ember)]', run: go('/load#resilience') },
    { label: "This week's meals", hint: 'The plan for every day', icon: UtensilsCrossed, tone: 'bg-[var(--zest)] text-[var(--on-zest)]', run: go('/operations?tab=meals') },
  ]

  const focusItem = (i: number) => menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[i]?.focus()

  function onKeyDown(e: React.KeyboardEvent) {
    const all = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const i = all.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem((i + 1) % all.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem((i - 1 + all.length) % all.length) }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
    else if (e.key === 'End') { e.preventDefault(); focusItem(all.length - 1) }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          requestAnimationFrame(() => focusItem(0))
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-[var(--sand)] py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]"
      >
        <Plus className={`size-4 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} aria-hidden />
        New
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Quick actions"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 flex w-72 origin-top-right flex-col gap-1 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-2 shadow-2xl"
          >
            {items.map(({ label, hint, icon: Icon, tone, run }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={run}
                className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-high)] focus-visible:bg-[var(--surface-high)] focus-visible:outline-none"
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
                  <span className="block text-xs text-[var(--ink-muted)]">{hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portalled: the top bar's backdrop blur would otherwise trap a fixed modal inside it. */}
      {adding && createPortal(<AddEventModal onClose={() => setAdding(false)} />, document.body)}
    </div>
  )
}
