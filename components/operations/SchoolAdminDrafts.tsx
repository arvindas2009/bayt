'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { SchoolDraft } from '@/types'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied. Paste it into your email.')
  } catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
}

function Draft({ draft }: { draft: SchoolDraft }) {
  const { nameOf } = useMemberLookup()
  const [body, setBody] = useState(draft.body)

  return (
    <li className="rounded-2xl bg-[var(--surface-raised)] p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-base text-[var(--ink)]">{draft.subject}</p>
      <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
        About {nameOf(draft.memberId)} · to {draft.to}
      </p>
      <details className="group mt-3">
        <summary className="cursor-pointer text-sm text-[var(--sand-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]">
          <span className="group-open:hidden">Read and edit</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <label className="mt-3 block">
          <span className="sr-only">Email text</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
          />
        </label>
        <button
          onClick={() => void copy(body)}
          className="mt-2 flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
        >
          <Copy className="size-3.5" aria-hidden />
          Copy text
        </button>
      </details>
    </li>
  )
}

/** Email drafts Bayt wrote. It never sends anything: you copy the text and send it yourself. */
export default function SchoolAdminDrafts({ drafts }: { drafts: SchoolDraft[] }) {
  if (drafts.length === 0) return <p className="py-4 text-base text-[var(--ink-muted)]">No emails to write this week.</p>
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {drafts.map((d, i) => (
        <Draft key={`${d.memberId}-${i}`} draft={d} />
      ))}
    </ul>
  )
}
