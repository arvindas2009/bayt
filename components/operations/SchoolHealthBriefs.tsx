'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, GraduationCap, Check, Square } from 'lucide-react'
import { toast } from 'sonner'
import type { SchoolHealthBrief } from '@/types/agents'
import type { FamilyMember } from '@/types'

interface Props {
  briefs: SchoolHealthBrief[]
  members: FamilyMember[]
}

const URGENCY_BORDER: Record<SchoolHealthBrief['urgencyLevel'], string> = {
  urgent:   'var(--error)',
  seasonal: 'var(--tertiary)',
  routine:  'transparent',
}

const URGENCY_BADGE: Record<SchoolHealthBrief['urgencyLevel'], CSSProperties> = {
  urgent:   { background: 'rgba(255,180,171,0.15)', color: 'var(--error)' },
  seasonal: { background: 'rgba(231,195,101,0.15)', color: 'var(--tertiary)' },
  routine:  { background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' },
}

// ─── Brief card ───────────────────────────────────────────────────────────────

function BriefCard({
  brief,
  isSent,
  onToggleSent,
}: {
  brief: SchoolHealthBrief
  isSent: boolean
  onToggleSent: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(brief.draftBody)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div
      style={{ borderLeft: `3px solid ${URGENCY_BORDER[brief.urgencyLevel]}`, borderTop: '1px solid var(--outline-variant)' }}
    >
      <div className="p-5">
        {/* Member + badges */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="text-sm font-semibold text-[var(--on-surface)]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {brief.memberName}
          </span>
          <span
            className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}
          >
            {brief.condition}
          </span>
          <span
            className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
            style={URGENCY_BADGE[brief.urgencyLevel]}
          >
            {brief.urgencyLevel}
          </span>
        </div>

        {/* Subject line */}
        <p className="mb-1 text-sm leading-snug text-[var(--on-surface)]">
          {brief.draftSubject}
        </p>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          {brief.schoolName}
        </p>

        {/* Expanded email body */}
        {expanded && (
          <div
            className="mb-4 p-4 font-mono text-xs leading-relaxed text-[var(--on-surface-variant)]"
            style={{ background: 'var(--surface-container)', whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--outline-variant)' }}
          >
            {brief.draftBody}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] transition-opacity hover:opacity-70"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? 'Collapse' : 'Preview'}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-opacity hover:opacity-70"
          >
            <Copy className="size-3" />
            Copy
          </button>

          <button
            onClick={onToggleSent}
            className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: isSent ? '#2ECC8A' : 'var(--on-surface-variant)' }}
          >
            {isSent ? <Check className="size-3" /> : <Square className="size-3" />}
            {isSent ? 'Sent' : 'Mark sent'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="mb-4 flex size-14 items-center justify-center"
        style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container)' }}
      >
        <GraduationCap className="size-6 text-[var(--on-surface-variant)] opacity-60" />
      </div>
      <p className="text-base font-medium text-[var(--on-surface)]">No health briefs needed.</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        All school health communications are current.
      </p>
    </div>
  )
}

// ─── SchoolHealthBriefs ───────────────────────────────────────────────────────

export default function SchoolHealthBriefs({ briefs }: Props) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setSentIds((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  // Sort: urgent first, then seasonal, then routine
  const sorted = [...briefs].sort((a, b) => {
    const order = { urgent: 0, seasonal: 1, routine: 2 }
    return order[a.urgencyLevel] - order[b.urgencyLevel]
  })

  const urgentCount = briefs.filter((b) => b.urgencyLevel === 'urgent').length

  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <header className="flex items-center gap-3 px-6 py-5">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          School Health Briefs
        </span>
        {urgentCount > 0 && (
          <span
            className="flex h-5 min-w-[20px] items-center justify-center px-1.5 font-mono text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'var(--error)', color: '#fff' }}
          >
            {urgentCount} urgent
          </span>
        )}
      </header>

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <ul>
          {sorted.map((brief, i) => {
            const key = `${brief.memberId}-${brief.condition}-${i}`
            return (
              <li key={key}>
                <BriefCard
                  brief={brief}
                  isSent={sentIds.has(key)}
                  onToggleSent={() => toggle(key)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
