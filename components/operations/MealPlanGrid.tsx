'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useFamilyStore } from '@/store/family-store'
import type { DayPlan, MealSummary } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

const FAMILY_NAMES = ['Salem', 'Fatima', 'Layla', 'Khalid', 'Aisha']

const MEMBER_COLOR: Record<string, string> = {
  Salem:  '#3D7FFF',
  Fatima: '#cfbcff',
  Layla:  '#2ECC8A',
  Khalid: '#e7c365',
  Aisha:  '#e87040',
}

// ─── Tag badge ────────────────────────────────────────────────────────────────

function tagStyle(tag: string): { bg: string; color: string } {
  const t = tag.toLowerCase()
  if (t.includes('gluten'))                             return { bg: 'rgba(61,127,255,0.18)',  color: '#7eb8f7' }
  if (t.includes('vegetarian') || t.includes('vegan')) return { bg: 'rgba(46,204,138,0.18)', color: '#6fcf97' }
  if (t.includes('diabetic') || t.includes('glycemic')) return { bg: 'rgba(46,204,138,0.18)', color: '#6fcf97' }
  if (t.includes('sodium') || t.includes('salt'))      return { bg: 'rgba(30,170,170,0.18)',  color: '#5fcfcf' }
  if (t.includes('nut'))                               return { bg: 'rgba(240,160,48,0.18)',  color: '#f0a030' }
  if (t.includes('soft'))                              return { bg: 'rgba(224,192,96,0.18)',  color: '#e0c060' }
  if (t.includes('fiber'))                             return { bg: 'rgba(96,204,96,0.18)',   color: '#60cc60' }
  return { bg: 'rgba(180,180,180,0.12)', color: 'var(--on-surface-variant)' }
}

function Badge({ label }: { label: string }) {
  const { bg, color } = tagStyle(label)
  return (
    <span
      className="inline-block font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 leading-none"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

// ─── Avatar dot row ───────────────────────────────────────────────────────────

function AvatarDots({
  suitableFor,
  size = 'sm',
}: {
  suitableFor: string[]
  size?: 'sm' | 'md'
}) {
  const storeMembers = useFamilyStore(s => s.family?.members)
  const names = storeMembers ? storeMembers.map(m => m.name.split(' ')[0]) : FAMILY_NAMES

  const suitable = (name: string) =>
    suitableFor.some(s => s.toLowerCase().includes(name.toLowerCase()))

  const dim = size === 'sm' ? 18 : 24
  const fs  = size === 'sm' ? 8  : 10

  return (
    <div className="flex items-center gap-1">
      {names.map(name => {
        const ok    = suitable(name)
        const color = MEMBER_COLOR[name] ?? 'var(--primary)'
        return (
          <div
            key={name}
            title={ok ? name : `${name} — not suitable`}
            className="flex items-center justify-center"
            style={{
              width: dim, height: dim, borderRadius: '50%',
              background: ok ? color : 'var(--surface-container)',
              border: `1px solid ${ok ? color : 'var(--outline-variant)'}`,
              opacity: ok ? 1 : 0.32,
              transition: 'opacity 0.2s',
            }}
          >
            <span
              className="select-none font-mono font-bold leading-none"
              style={{ fontSize: fs, color: ok ? '#000' : 'var(--on-surface-variant)' }}
            >
              {name[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Meal dialog ──────────────────────────────────────────────────────────────

function MealDialog({ meal, onClose }: { meal: MealSummary | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )
  useEffect(() => {
    if (!meal) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [meal, handleKey])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {meal && (
        <motion.div
          key="dialog-root"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={onClose}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              className="pointer-events-auto w-full max-w-md"
              initial={{ y: 14, scale: 0.96 }}
              animate={{ y: 0,  scale: 1 }}
              exit={{ y: 8,  scale: 0.97 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{ background: 'var(--surface-container-highest)', border: '1px solid var(--outline-variant)' }}
            >
              <div
                className="flex items-start justify-between p-5"
                style={{ borderBottom: '1px solid var(--outline-variant)' }}
              >
                <h2
                  className="text-lg font-bold leading-snug text-[var(--on-surface)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {meal.name}
                </h2>
                <button
                  onClick={onClose}
                  className="ml-3 shrink-0 p-1 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-5 p-5">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-bold text-3xl text-[var(--primary)]"
                    style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                  >
                    {meal.calories}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
                    kcal
                  </span>
                </div>
                {meal.tags.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                      Dietary tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {meal.tags.map(tag => <Badge key={tag} label={tag} />)}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    Family suitability
                  </p>
                  <AvatarDots suitableFor={meal.suitableFor} size="md" />
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {FAMILY_NAMES.map(name => {
                      const ok = meal.suitableFor.some(s => s.toLowerCase().includes(name.toLowerCase()))
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: ok ? MEMBER_COLOR[name] : 'var(--outline-variant)' }}
                          />
                          <span
                            className="font-mono text-xs"
                            style={{ color: ok ? 'var(--on-surface)' : 'var(--on-surface-variant)', opacity: ok ? 1 : 0.5 }}
                          >
                            {name}
                          </span>
                          {!ok && (
                            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--error)] opacity-70">
                              skip
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Compact meal card ────────────────────────────────────────────────────────

function CompactMealCard({
  meal,
  mealType,
  onClick,
}: {
  meal: MealSummary
  mealType: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left transition-colors"
      style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}
    >
      <div className="flex flex-col gap-2 p-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-55">
          {mealType}
        </span>
        <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--on-surface)] transition-colors group-hover:text-[var(--primary)]">
          {meal.name}
        </p>
        <div className="flex flex-wrap gap-1">
          {meal.tags.slice(0, 2).map(tag => <Badge key={tag} label={tag} />)}
          {meal.tags.length > 2 && (
            <span className="self-center font-mono text-[9px] text-[var(--on-surface-variant)]">
              +{meal.tags.length - 2}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span
            className="font-mono text-[10px] text-[var(--on-surface-variant)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {meal.calories} kcal
          </span>
          <AvatarDots suitableFor={meal.suitableFor} />
        </div>
      </div>
    </button>
  )
}

// ─── Expanded meal card ───────────────────────────────────────────────────────

function ExpandedMealCard({
  meal,
  mealType,
  onClick,
}: {
  meal: MealSummary
  mealType: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left"
      style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}
    >
      <div className="flex flex-col gap-3 p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          {mealType}
        </span>
        <p className="text-sm font-medium leading-snug text-[var(--on-surface)] transition-colors group-hover:text-[var(--primary)]">
          {meal.name}
        </p>
        {meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meal.tags.map(tag => <Badge key={tag} label={tag} />)}
          </div>
        )}
        <div
          className="mt-auto flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--outline-variant)' }}
        >
          <span
            className="font-mono text-[10px] text-[var(--on-surface-variant)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {meal.calories} kcal
          </span>
          <AvatarDots suitableFor={meal.suitableFor} />
        </div>
      </div>
    </button>
  )
}

// ─── Grid animation variants ──────────────────────────────────────────────────

const colVariants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' as const },
  }),
}

// ─── MealPlanGrid ─────────────────────────────────────────────────────────────

interface Props {
  weeklyPlan: DayPlan[]
  density?: 'compact' | 'expanded'
}

export default function MealPlanGrid({ weeklyPlan, density = 'compact' }: Props) {
  const [selected, setSelected] = useState<MealSummary | null>(null)

  const mealRows = (day: DayPlan) => [
    { meal: day.breakfast, label: 'Breakfast' },
    { meal: day.lunch,     label: 'Lunch' },
    { meal: day.dinner,    label: 'Dinner' },
  ]

  return (
    <>
      {/* ── Expanded desktop: column-per-day ────────────────────────────── */}
      {density === 'expanded' && (
        <div className="hidden overflow-x-auto md:block">
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: 'repeat(7, minmax(160px, 1fr))',
              background: 'var(--outline-variant)',
              border: '1px solid var(--outline-variant)',
              minWidth: 1120,
            }}
          >
            {weeklyPlan.map((day, colIdx) => (
              <motion.div
                key={day.day}
                className="flex flex-col"
                style={{ background: 'var(--surface-container-lowest)' }}
                variants={colVariants}
                custom={colIdx}
                initial="hidden"
                animate="show"
              >
                {/* Day header */}
                <div
                  className="p-3"
                  style={{
                    background: 'var(--surface-container-low)',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <p className="text-center font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface)]">
                    {day.day}
                  </p>
                </div>
                {/* Meal cards */}
                <div className="flex flex-col gap-3 p-3">
                  {mealRows(day).map(({ meal, label }) => (
                    <ExpandedMealCard
                      key={label}
                      meal={meal}
                      mealType={label}
                      onClick={() => setSelected(meal)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Compact desktop: row-header + column stacks ──────────────────── */}
      {density === 'compact' && (
        <div className="hidden overflow-x-auto md:block">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))' }}
          >
            {weeklyPlan.map(({ day }) => (
              <div
                key={day}
                className="py-2 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]"
              >
                {DAY_ABBR[day] ?? day.slice(0, 3)}
              </div>
            ))}
            {weeklyPlan.map((day, colIdx) => (
              <motion.div
                key={day.day}
                className="flex flex-col gap-2"
                variants={colVariants}
                custom={colIdx}
                initial="hidden"
                animate="show"
              >
                {mealRows(day).map(({ meal, label }) => (
                  <CompactMealCard
                    key={label}
                    meal={meal}
                    mealType={label}
                    onClick={() => setSelected(meal)}
                  />
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile: vertical day list (both modes) ───────────────────────── */}
      <div className="flex flex-col gap-5 md:hidden">
        {weeklyPlan.map((day, i) => (
          <motion.div
            key={day.day}
            variants={colVariants}
            custom={i}
            initial="hidden"
            animate="show"
          >
            <div
              className="mb-2 px-3 py-1.5"
              style={{ borderLeft: '2px solid var(--primary)', background: 'var(--surface-container)' }}
            >
              <span className="font-mono text-xs font-medium uppercase tracking-widest text-[var(--on-surface)]">
                {day.day}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {mealRows(day).map(({ meal, label }) =>
                density === 'expanded' ? (
                  <ExpandedMealCard
                    key={label}
                    meal={meal}
                    mealType={label}
                    onClick={() => setSelected(meal)}
                  />
                ) : (
                  <CompactMealCard
                    key={label}
                    meal={meal}
                    mealType={label}
                    onClick={() => setSelected(meal)}
                  />
                )
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <MealDialog meal={selected} onClose={() => setSelected(null)} />
    </>
  )
}
