'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { DayPlan, MealSummary } from '@/types'

const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner'] as const

/** One dot per family member: filled when the dish suits them as served, hollow when they get a substitute. */
function Dots({ meal }: { meal: MealSummary }) {
  const { members, colorOf } = useMemberLookup()
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {members.map((m) => {
        const ok = meal.suitableFor.includes(m.id)
        const color = colorOf(m.id)
        return (
          <span
            key={m.id}
            className="size-2.5 rounded-full"
            style={{ background: ok ? color : 'transparent', border: `1.5px solid ${color}`, opacity: ok ? 1 : 0.55 }}
          />
        )
      })}
    </span>
  )
}

/** The summary read aloud for the dots, so the colour code is not the only way to know who it suits. */
function suitability(meal: MealSummary, names: (id: string) => string, ids: string[]): string {
  const subs = ids.filter((id) => !meal.suitableFor.includes(id))
  if (subs.length === 0) return 'Suits everyone as served.'
  return `Suits everyone except ${subs.map(names).join(', ')}, who get a different dish.`
}

function MealDialog({ meal, label, onClose }: { meal: MealSummary; label: string; onClose: () => void }) {
  const { members, nameOf, colorOf } = useMemberLookup()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--scrim)]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={meal.name}
        className="relative w-full max-w-md rounded-2xl bg-[var(--surface-raised)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--ink-muted)]">{label}</p>
            <h2 className="mt-0.5 font-display text-2xl leading-snug text-[var(--ink)]">{meal.name}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <ul className="mt-5 flex flex-col gap-2.5">
          {members.map((m) => {
            const ok = meal.suitableFor.includes(m.id)
            const sub = meal.substitutions?.find((s) => s.memberId === m.id)
            return (
              <li key={m.id} className="flex items-start gap-3">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: ok ? colorOf(m.id) : 'transparent', border: `1.5px solid ${colorOf(m.id)}` }}
                  aria-hidden
                />
                <p className="text-base leading-snug text-[var(--ink)]">
                  {m.name}
                  {!ok && (
                    <span className="text-[var(--ink-muted)]">
                      {sub ? `: gets ${sub.name}` : ': needs their own meal'}
                    </span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>

        {meal.tags.length > 0 && (
          <p className="mt-5 text-sm text-[var(--ink-muted)]">{meal.tags.join(' · ')}</p>
        )}
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          About <span className="num">{meal.calories}</span> kcal per serving. {suitability(meal, nameOf, members.map((m) => m.id))}
        </p>
      </div>
    </div>,
    document.body,
  )
}

/**
 * The week's meals: names and who each dish suits. Tags, calories and substitutions live in the
 * dialog, so the grid stays readable.
 */
export default function MealPlanGrid({ weeklyPlan }: { weeklyPlan: DayPlan[] }) {
  const [open, setOpen] = useState<{ meal: MealSummary; label: string } | null>(null)
  const { members, nameOf } = useMemberLookup()
  const ids = members.map((m) => m.id)

  const rows = (day: DayPlan) => [day.breakfast, day.lunch, day.dinner].map((meal, i) => ({ meal, label: MEAL_LABELS[i] }))

  return (
    <>
      <Stagger className="grid gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-7" gap={0.05}>
        {weeklyPlan.map((day) => (
          <StaggerItem key={day.day} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-[var(--ink-muted)]">{day.day}</h3>
            {rows(day).map(({ meal, label }) => (
              <button
                key={label}
                onClick={() => setOpen({ meal, label: `${day.day} · ${label}` })}
                aria-label={`${day.day} ${label}: ${meal.name}. ${suitability(meal, nameOf, ids)}`}
                className="group flex flex-col gap-2 rounded-2xl border border-transparent bg-[var(--surface-raised)] p-3 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[var(--sand-text)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
              >
                <span className="text-xs text-[var(--ink-muted)]">{label}</span>
                <span className="line-clamp-2 text-sm leading-snug text-[var(--ink)]">{meal.name}</span>
                <Dots meal={meal} />
              </button>
            ))}
          </StaggerItem>
        ))}
      </Stagger>
      {open && <MealDialog meal={open.meal} label={open.label} onClose={() => setOpen(null)} />}
    </>
  )
}
