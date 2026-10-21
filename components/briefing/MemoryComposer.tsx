'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useBriefingStore } from '@/store/briefing-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { useViewingAs } from '@/lib/hooks/useViewingAs'

const MAX = 280

/** Capture a memory: the family types what someone said, and Bayt keeps it word for word. */
export default function MemoryComposer() {
  const { members } = useMemberLookup()
  const { id: viewingId } = useViewingAs()
  const refreshBriefing = useBriefingStore((s) => s.refreshBriefing)
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState('')
  const [speakerId, setSpeakerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const speaker = speakerId ?? viewingId ?? members[0]?.id ?? ''

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, memberId: speaker }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return void toast.error(body.error ?? 'Could not save the memory')
      toast.success('Saved to the Memory Vault')
      setQuote('')
      setOpen(false)
      await refreshBriefing().catch(() => undefined)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
      >
        Capture a memory
      </button>
    )
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--ink-muted)]">
        What did they say?
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value.slice(0, MAX))}
          rows={3}
          autoFocus
          className="resize-none rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-base text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          Said by
          <select
            value={speaker}
            onChange={(e) => setSpeakerId(e.target.value)}
            className="rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink)]"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving || quote.trim().length < 3}
          className="rounded-full bg-[var(--sand)] px-4 py-1.5 text-sm font-medium text-[var(--on-sand)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
