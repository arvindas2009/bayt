'use client'

import { AlertTriangle, Info, Lightbulb, Search } from 'lucide-react'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import type { FamilyPattern } from '@/types/agents'

const RANK: Record<FamilyPattern['severity'], number> = { critical: 0, warning: 1, info: 2 }
const SEVERITY: Record<FamilyPattern['severity'], { word: string; icon: typeof Info; className: string }> = {
  critical: { word: 'Act soon', icon: AlertTriangle, className: 'bg-[var(--ember)] text-[var(--on-ember)]' },
  warning: { word: 'Worth a look', icon: Search, className: 'bg-[var(--zest)] text-[var(--on-zest)]' },
  info: { word: 'Good to know', icon: Info, className: 'bg-[var(--surface-high)] text-[var(--ink)]' },
}

/**
 * Things that run across the family (shared risks, the same condition in two generations): what it
 * is, who it touches, what to do. The model's own "confidence" figure is not shown, because nothing
 * computes it.
 */
export default function FamilyPatterns({ patterns, memberId }: { patterns: FamilyPattern[]; memberId?: string }) {
  const { nameOf, colorOf } = useMemberLookup()
  const shown = patterns
    .filter((p) => !memberId || p.affectedMembers.includes(memberId))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity])

  if (shown.length === 0) {
    return (
      <p className="py-3 text-base text-[var(--ink-muted)]">
        {memberId ? 'No family patterns involve them right now.' : 'No family patterns found.'}
      </p>
    )
  }

  return (
    <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
      {shown.map((p) => {
        const s = SEVERITY[p.severity]
        const Icon = s.icon
        return (
          <StaggerItem as="li" key={p.id} className="flex flex-col gap-3 rounded-2xl bg-[var(--surface-raised)] p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}>
              <Icon className="size-3.5" aria-hidden />
              {s.word}
            </span>
            <h3 className="text-lg font-semibold leading-snug text-[var(--ink)]">{p.title}</h3>
            <p className="flex flex-wrap items-center gap-2">
              {p.affectedMembers.map((id) => (
                <span key={id} className="flex items-center gap-1.5 rounded-full bg-[var(--surface-high)] px-2.5 py-0.5 text-sm text-[var(--ink)]">
                  <span className="size-2 rounded-full" style={{ background: colorOf(id) }} aria-hidden />
                  {nameOf(id)}
                </span>
              ))}
            </p>
            <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{p.description}</p>
            <p className="flex items-start gap-2 rounded-xl bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--ink)]">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--sand-text)]" aria-hidden />
              {p.recommendation}
            </p>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}
