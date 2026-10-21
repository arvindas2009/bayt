'use client'

import { useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export interface TabItem {
  id: string
  label: string
  icon?: LucideIcon
  /** Shown as a small badge when present (0 is shown too). */
  count?: number
  content: React.ReactNode
}

interface Props {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  label: string
  className?: string
}

/**
 * The pattern for pages with several unrelated parts: one tab bar, one panel at a time.
 * Accessible tabs (arrow keys, Home/End), a lime pill that slides to the chosen tab, and the
 * panel fades between tabs.
 */
export default function Tabs({ tabs, value, onChange, label, className = '' }: Props) {
  const uid = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const current = tabs.find((t) => t.id === value) ?? tabs[0]

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === current.id)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(tabs[next].id)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full [scrollbar-width:none] border border-[var(--line)] bg-[var(--surface)]/80 p-1 backdrop-blur"
      >
        {tabs.map((t) => {
          const on = t.id === current.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${uid}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.97] ${
                on ? 'text-[var(--on-sand)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {on && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="absolute inset-0 rounded-full bg-[var(--sand)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              {Icon && <Icon className="relative size-4" aria-hidden />}
              <span className="relative">{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`num relative rounded-full px-1.5 text-xs ${
                    on ? 'bg-[var(--on-sand)] text-[var(--sand)]' : 'bg-[var(--surface-high)] text-[var(--ink)]'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${current.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {current.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
