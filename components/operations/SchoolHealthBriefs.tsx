'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { SchoolHealthBrief } from '@/types/agents'

const ORDER: Record<SchoolHealthBrief['urgencyLevel'], number> = { urgent: 0, seasonal: 1, routine: 2 }
const WHEN: Record<SchoolHealthBrief['urgencyLevel'], string> = {
  urgent: 'Send soon',
  seasonal: 'Seasonal',
  routine: 'Routine',
}

function Brief({ brief }: { brief: SchoolHealthBrief }) {
  const { nameOf } = useMemberLookup()
  const [sent, setSent] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief.draftBody)
      toast.success('Copied. Paste it into your email.')
    } catch {
      toast.error('Could not copy. Select the text and copy it yourself.')
    }
  }

  return (
    <li className="rounded-2xl bg-[var(--surface-raised)] p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-base text-[var(--ink)]">{brief.draftSubject}</p>
      <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
        {nameOf(brief.memberId)} · {brief.schoolName} ·{' '}
        <span className={brief.urgencyLevel === 'urgent' ? 'text-[var(--ember)]' : ''}>{WHEN[brief.urgencyLevel]}</span>
      </p>
      <details className="group mt-3">
        <summary className="cursor-pointer text-sm text-[var(--sand-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]">
          <span className="group-open:hidden">Read it</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--ink-muted)]">
          {brief.draftBody}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => void copy()}
            className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
          >
            <Copy className="size-3.5" aria-hidden />
            Copy text
          </button>
          <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <input type="checkbox" checked={sent} onChange={(e) => setSent(e.target.checked)} className="size-4 accent-[var(--sand)]" />
            I sent it
          </label>
        </div>
      </details>
    </li>
  )
}

/** Health notes for school, written from templates on this computer (conditions are never sent to a model). */
export default function SchoolHealthBriefs({ briefs }: { briefs: SchoolHealthBrief[] }) {
  if (briefs.length === 0) return <p className="py-4 text-base text-[var(--ink-muted)]">No school health notes needed.</p>
  const sorted = [...briefs].sort((a, b) => ORDER[a.urgencyLevel] - ORDER[b.urgencyLevel])
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {sorted.map((b, i) => (
        <Brief key={`${b.memberId}-${b.condition}-${i}`} brief={b} />
      ))}
    </ul>
  )
}
