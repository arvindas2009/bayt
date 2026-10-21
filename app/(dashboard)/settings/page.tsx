'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getToday } from '@/lib/time/today'
import { getCulturalContext } from '@/lib/utils/cultural-context'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import MemberEditModal from '@/components/members/MemberEditModal'
import AddMemberModal from '@/components/members/AddMemberModal'
import type { FamilyMember } from '@/types'

interface VaultStatus {
  enabled: boolean
  ollamaOnline: boolean | null
  status: 'disabled' | 'active' | 'offline'
}

const SEASONS: Record<string, string> = {
  ramadan: 'Ramadan',
  dust_season: 'Dust season',
  summer_heat: 'Summer heat',
  exam_period: 'Exam period',
  school_holiday: 'School holiday',
}

const BUTTON =
  'flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50'

export default function SettingsPage() {
  const family = useFamilyStore((s) => s.family)
  const { colorOf } = useMemberLookup()
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [adding, setAdding] = useState(false)
  const [vault, setVault] = useState<VaultStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const members = family?.members ?? []
  const culture = getCulturalContext(getToday(), members)

  const loadVault = useCallback(async () => {
    try {
      const res = await fetch('/api/privacy/status', { cache: 'no-store' })
      if (res.ok) setVault((await res.json()) as VaultStatus)
    } catch {
      setVault(null)
    }
  }, [])

  useEffect(() => {
    void loadVault()
  }, [loadVault])

  const toggleVault = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/privacy/status', { method: 'POST', cache: 'no-store' })
      if (!res.ok) throw new Error()
      setVault((await res.json()) as VaultStatus)
    } catch {
      toast.error('Could not change the Privacy Vault')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-10 pb-20 pt-8">
      <header>
        <h1 className="font-display text-5xl md:text-6xl text-[var(--ink)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">The {family?.name ?? ''} household.</p>
      </header>

      <section aria-labelledby="members-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="members-title" className="font-display text-2xl text-[var(--ink)]">People</h2>
          <button onClick={() => setAdding(true)} className={BUTTON}>
            <Plus className="size-3.5" aria-hidden />
            Add someone
          </button>
        </div>
        <ul className="mt-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-4 border-b border-[var(--line)] py-4">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(m.id) }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base text-[var(--ink)]">{m.name}</p>
                <p className="text-sm text-[var(--ink-muted)]">
                  <span className="capitalize">{m.role}</span>, <span className="num">{m.age}</span>
                  {m.dietaryNeeds.length > 0 && <> · {m.dietaryNeeds.join(', ')}</>}
                </p>
              </div>
              <button
                onClick={() => setEditing(m)}
                aria-label={`Edit ${m.name}`}
                className="rounded-full border border-[var(--line-strong)] p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
          {members.length === 0 && <li className="py-4 text-base text-[var(--ink-muted)]">No one has been added yet.</li>}
        </ul>
      </section>

      <section aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="font-display text-2xl text-[var(--ink)]">Privacy</h2>
        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <p className="text-base text-[var(--ink)]">Privacy Vault</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
              When on, health analysis runs on a model on this computer and never falls back to the cloud. If that model is not running, Bayt writes
              the health summary itself from your records.
            </p>
            {vault?.status === 'offline' && (
              <p className="mt-1 text-sm text-[var(--ember)]">The local model is not running, so Bayt is using its own summaries.</p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={vault?.enabled ?? false}
            aria-label="Privacy Vault"
            disabled={busy || !vault}
            onClick={() => void toggleVault()}
            className="relative mt-1 h-6 w-11 shrink-0 rounded-full border border-[var(--line-strong)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50"
            style={{ background: vault?.enabled ? 'var(--sand)' : 'var(--surface-raised)' }}
          >
            <span
              className="absolute top-0.5 size-4.5 rounded-full bg-[var(--ink)] transition-transform"
              style={{ left: 2, transform: vault?.enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li>Meal plans and the load summary are written without diagnoses or medication names.</li>
          <li>Calendar titles and documents you drop in can reach the AI model that reads them.</li>
          <li>Everything Bayt stores lives in a database on this computer.</li>
        </ul>
      </section>

      <section aria-labelledby="season-title">
        <h2 id="season-title" className="font-display text-2xl text-[var(--ink)]">Today&rsquo;s season</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Bayt adjusts meals and wording for these.</p>
        {culture.activeSeasons.length > 0 ? (
          <p className="mt-3 text-base text-[var(--ink)]">{culture.activeSeasons.map((s) => SEASONS[s] ?? s).join(', ')}</p>
        ) : (
          <p className="mt-3 text-base text-[var(--ink-muted)]">Nothing special today.</p>
        )}
        {culture.upcomingEvents.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-[var(--ink-muted)]">
            {culture.upcomingEvents.map((e) => (
              <li key={e.name}>
                {e.name}, in <span className="num">{e.daysUntil}</span> {e.daysUntil === 1 ? 'day' : 'days'}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <MemberEditModal member={editing} onClose={() => setEditing(null)} />}
      {adding && <AddMemberModal onClose={() => setAdding(false)} />}
    </div>
  )
}
