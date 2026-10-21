'use client'

import { ArrowRight, Pill, UserX } from 'lucide-react'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { Avatar } from '@/components/ui/Card'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import type { Medication } from '@/types'

/**
 * Medications with who gives them and who could step in. A medication nobody else can give is the
 * most fragile thing in a household, so "no backup" is said in words, not hidden.
 */
export default function MedicationList({ medications, showPatient = false }: { medications: Medication[]; showPatient?: boolean }) {
  const { nameOf, colorOf } = useMemberLookup()

  if (medications.length === 0) return <p className="py-3 text-base text-[var(--ink-muted)]">No medications recorded.</p>

  const person = (id: string) => (
    <span className="flex items-center gap-1.5">
      <Avatar name={nameOf(id)} color={colorOf(id)} size="sm" />
      <span className="text-sm text-[var(--ink)]">{nameOf(id)}</span>
    </span>
  )

  return (
    <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
      {medications.map((m) => {
        const giver = m.ownerId ?? m.memberId
        const backups = (m.backupIds ?? []).filter((id) => id !== giver)
        const selfGiven = giver === m.memberId
        const fragile = !selfGiven && backups.length === 0
        return (
          <StaggerItem
            as="li"
            key={m.id}
            className={`rounded-2xl border bg-[var(--surface-raised)] p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
              fragile ? 'border-[var(--ember)]' : 'border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--dusk)] text-[var(--on-dusk)]">
                <Pill className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[var(--ink)]">{m.name}</p>
                <p className="text-sm text-[var(--ink-muted)]">
                  {m.dosage}, {m.frequency}
                  {showPatient && <> · for {nameOf(m.memberId)}</>}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {selfGiven ? (
                <span className="text-sm text-[var(--ink-muted)]">Takes it themselves</span>
              ) : (
                <>
                  <span className="text-xs text-[var(--ink-muted)]">Given by</span>
                  {person(giver)}
                  {backups.length > 0 && (
                    <>
                      <ArrowRight className="size-3.5 text-[var(--ink-muted)]" aria-hidden />
                      <span className="text-xs text-[var(--ink-muted)]">backup</span>
                      {backups.map((id) => (
                        <span key={id}>{person(id)}</span>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {fragile && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--ember-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ember)]">
                <UserX className="size-3.5" aria-hidden />
                No one else can give it
              </p>
            )}
            {m.interactions.length > 0 && (
              <p className="mt-2 text-xs text-[var(--ink-muted)]">Watch for: {m.interactions.join('; ')}</p>
            )}
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}
