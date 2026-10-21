'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, Pin, Plus } from 'lucide-react'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { useViewingAs } from '@/lib/hooks/useViewingAs'
import { PIN_IDS, PINS, SUGGESTED_PINS, type PinId } from '@/lib/pins/registry'
import { usePinStore, usePins } from '@/store/pin-store'
import { CARD, IconBadge } from '@/components/ui/Card'
import PinButton from './PinButton'
import PinWidget from './PinWidgets'

/** Features that need a full row; the rest share a three-column grid. */
const WIDE: PinId[] = ['drop']

/**
 * The person's own corner of the Briefing: features pinned from Load, Operations and Health, or
 * added here. Saved in this browser for whoever the app is viewed as.
 */
export default function PinnedBoard() {
  const viewing = useViewingAs()
  const pins = usePins(viewing.id)
  const toggle = usePinStore((s) => s.toggle)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <section id="pinned" aria-labelledby="pinned-title" className="flex scroll-mt-28 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={Pin} tone="muted" />
          <div>
            <h2 id="pinned-title" className="text-sm font-semibold text-[var(--ink)]">
              Pinned{viewing.member ? ` for ${viewing.member.name}` : ''}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">Pin anything from Load, Operations or Health, or add it here.</p>
          </div>
        </div>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={open}
            className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
          >
            <Plus className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} aria-hidden />
            Add
          </button>
          <AnimatePresence>
            {open && (
              <motion.ul
                aria-label="Features you can pin"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 top-full z-40 mt-2 flex w-72 origin-top-right flex-col gap-1 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-2 shadow-2xl"
              >
                {PIN_IDS.map((id) => {
                  const p = PINS[id]
                  const on = pins.includes(id)
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(viewing.id, id)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-high)] focus-visible:bg-[var(--surface-high)] focus-visible:outline-none"
                      >
                        <IconBadge icon={p.icon} tone={p.tone} className="!size-8 !rounded-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[var(--ink)]">{p.title}</span>
                          <span className="block text-xs text-[var(--ink-muted)]">{p.hint}</span>
                        </span>
                        <span
                          aria-hidden
                          className={`flex size-5 items-center justify-center rounded-md border ${
                            on ? 'border-transparent bg-[var(--sand)] text-[var(--on-sand)]' : 'border-[var(--line-strong)]'
                          }`}
                        >
                          {on && <Check className="size-3.5" />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      {pins.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl border-2 border-dashed border-[var(--line-strong)] p-6">
          <p className="text-base text-[var(--ink)]">Nothing pinned yet. Start with one of these:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PINS.map((id) => {
              const p = PINS[id]
              const Icon = p.icon
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(viewing.id, id)}
                  className="flex items-center gap-2 rounded-full bg-[var(--surface-raised)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
                >
                  <Icon className="size-4" aria-hidden />
                  Pin {p.title.toLowerCase()}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <ul className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {pins.map((id) => {
              const p = PINS[id]
              return (
                <motion.li
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className={`${CARD} flex flex-col gap-4 !p-5 ${WIDE.includes(id) ? 'md:col-span-2 lg:col-span-3' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconBadge icon={p.icon} tone={p.tone} className="!size-8 !rounded-xl" />
                    <h3 className="flex-1 text-sm font-semibold text-[var(--ink)]">{p.title}</h3>
                    <Link
                      href={p.href}
                      aria-label={`Open ${p.title}`}
                      className="flex size-8 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-high)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
                    >
                      <ArrowUpRight className="size-4" aria-hidden />
                    </Link>
                    <PinButton id={id} compact />
                  </div>
                  <PinWidget id={id} />
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
