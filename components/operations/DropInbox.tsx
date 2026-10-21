'use client'

import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileUp, Loader2, Check } from 'lucide-react'
import { fetchFamily } from '@/lib/api/family'
import { useBriefingStore } from '@/store/briefing-store'
import { useFamilyStore } from '@/store/family-store'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { useViewingAs } from '@/lib/hooks/useViewingAs'
import { referenceFor } from '@/lib/load/reference-durations'
import { EVENT_CATEGORIES, OBLIGATION_CATEGORIES, type Candidate } from '@/lib/ingest/types'

interface Reply {
  candidates: Candidate[]
  method: 'model' | 'dates'
  notes: string[]
  label: string
  error?: string
}

interface Row extends Candidate {
  include: boolean
  ownerId: string
}

const FIELD =
  'w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]'

/**
 * Drop anything: a PDF, a text file, or pasted text. The server turns it into text and Bayt reads it
 * and proposes what it asks of the family. Nothing is saved until the person reviews each item and confirms.
 */
export default function DropInbox({ demo }: { demo: boolean }) {
  const { members, nameOf } = useMemberLookup()
  const viewing = useViewingAs()
  const setFamily = useFamilyStore((s) => s.setFamily)
  const fetchBriefing = useBriefingStore((s) => s.fetchBriefing)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'review' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [reply, setReply] = useState<Reply | null>(null)

  const reset = () => {
    setText('')
    setFileName(null)
    setRows([])
    setReply(null)
    setError(null)
    setPhase('idle')
    if (fileRef.current) fileRef.current.value = ''
  }

  const read = async (file: File | null) => {
    setError(null)
    setPhase('reading')
    try {
      const form = new FormData()
      if (file) form.set('file', file)
      else form.set('text', text)
      const res = await fetch('/api/inbox', { method: 'POST', body: form })
      const body = (await res.json().catch(() => ({}))) as Partial<Reply>
      if (!res.ok) throw new Error(body.error ?? `Could not read that (${res.status})`)
      const next = body as Reply
      const fallbackOwner = viewing.id ?? members[0]?.id ?? ''
      setReply(next)
      setRows(next.candidates.map((c) => ({ ...c, include: true, ownerId: c.suggestedOwnerId ?? fallbackOwner })))
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document.')
      setPhase('idle')
    }
  }

  const onFile = (file: File | null | undefined) => {
    if (!file) return
    setFileName(file.name)
    void read(file)
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const chosen = rows.filter((r) => r.include)
  const incomplete = chosen.some((r) => !r.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !r.ownerId)

  const save = async () => {
    setPhase('saving')
    try {
      const res = await fetch('/api/inbox/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: chosen.map((r) => ({
            kind: r.kind,
            title: r.title.trim(),
            date: r.date,
            time: r.kind === 'event' ? r.time : null,
            category: r.category,
            taskType: r.taskType,
            ownerId: r.ownerId,
            consequence: r.consequence,
          })),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { obligations?: number; events?: number; error?: string }
      if (!res.ok) throw new Error(body.error ?? `Could not save (${res.status})`)
      toast.success(`Saved ${chosen.length} ${chosen.length === 1 ? 'item' : 'items'}. They now count in everyone's load.`)
      // New work changes the load picture, so refresh what the other pages read.
      await Promise.allSettled([fetchFamily().then(setFamily), fetchBriefing()])
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
      setPhase('review')
    }
  }

  if ((phase === 'review' || phase === 'saving') && reply) {
    return (
      <section aria-labelledby={`${inputId}-title`} className="rounded-2xl bg-[var(--surface-raised)] p-6">
        <h2 id={`${inputId}-title`} className="font-display text-2xl text-[var(--ink)]">
          {rows.length === 0 ? 'Nothing to add from this' : `Found ${rows.length} ${rows.length === 1 ? 'item' : 'items'} in ${reply.label}`}
        </h2>
        {reply.error && !demo && (
          <p className="mt-1 text-sm text-[var(--ink-muted)]">The reading model was unavailable ({reply.error}), so only the dates in the text were used.</p>
        )}
        {reply.notes.map((n) => (
          <p key={n} className="mt-1 text-sm text-[var(--ink-muted)]">{n}</p>
        ))}
        {rows.length === 0 && (
          <p className="mt-2 text-base text-[var(--ink-muted)]">No dated task or event was found. Nothing was saved.</p>
        )}

        <ul className="mt-5 flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.key} className={`rounded-xl border border-[var(--line)] p-4 ${r.include ? '' : 'opacity-50'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(r.key, { include: e.target.checked })}
                  aria-label={`Save ${r.title}`}
                  className="mt-2.5 size-4 accent-[var(--sand)]"
                />
                <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-12">
                  <label className="md:col-span-12">
                    <span className="sr-only">Title</span>
                    <input value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} className={FIELD} maxLength={120} />
                  </label>
                  <label className="md:col-span-3">
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">{r.kind === 'obligation' ? 'Due' : 'Date'}</span>
                    <input type="date" value={r.date} onChange={(e) => update(r.key, { date: e.target.value })} className={FIELD} />
                  </label>
                  {r.kind === 'event' && (
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-xs text-[var(--ink-muted)]">Time</span>
                      <input type="time" value={r.time ?? ''} onChange={(e) => update(r.key, { time: e.target.value || null })} className={FIELD} />
                    </label>
                  )}
                  <label className="md:col-span-3">
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">Kind</span>
                    <select
                      value={r.kind}
                      onChange={(e) => {
                        const kind = e.target.value as 'obligation' | 'event'
                        update(r.key, { kind, category: kind === 'obligation' ? 'Home' : 'family' })
                      }}
                      className={FIELD}
                    >
                      <option value="obligation">Task with a deadline</option>
                      <option value="event">Event</option>
                    </select>
                  </label>
                  <label className="md:col-span-3">
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">Category</span>
                    <select value={r.category} onChange={(e) => update(r.key, { category: e.target.value })} className={FIELD}>
                      {(r.kind === 'obligation' ? OBLIGATION_CATEGORIES : EVENT_CATEGORIES).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="md:col-span-3">
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                      Who does it{r.suggestedOwnerId ? ` (the document names ${nameOf(r.suggestedOwnerId)})` : ''}
                    </span>
                    <select value={r.ownerId} onChange={(e) => update(r.key, { ownerId: e.target.value })} className={FIELD}>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </label>
                  {r.kind === 'obligation' && (
                    <label className="md:col-span-12">
                      <span className="mb-1 block text-xs text-[var(--ink-muted)]">If it is missed</span>
                      <input
                        value={r.consequence}
                        onChange={(e) => update(r.key, { consequence: e.target.value })}
                        placeholder="The document does not say"
                        maxLength={240}
                        className={FIELD}
                      />
                    </label>
                  )}
                  <p className="text-xs leading-relaxed text-[var(--ink-muted)] md:col-span-12">
                    From the document: &ldquo;{r.quote}&rdquo; Counted as about{' '}
                    <span className="num">{referenceFor(r.taskType).minutes}</span> minutes of work.
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {rows.length > 0 && (
            <button
              onClick={() => void save()}
              disabled={phase === 'saving' || chosen.length === 0 || incomplete}
              className="flex items-center gap-2 rounded-full bg-[var(--sand)] px-5 py-2 text-sm font-medium text-[var(--on-sand)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-40"
            >
              {phase === 'saving' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              Save {chosen.length} {chosen.length === 1 ? 'item' : 'items'}
            </button>
          )}
          <button
            onClick={reset}
            disabled={phase === 'saving'}
            className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50"
          >
            {rows.length === 0 ? 'Try something else' : 'Discard'}
          </button>
        </div>
      </section>
    )
  }

  const busy = phase === 'reading'

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3">
      <div>
        <h2 id={`${inputId}-title`} className="font-display text-2xl text-[var(--ink)]">Drop anything</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          A school circular, a bill, a letter, an appointment card. Bayt reads it and proposes what it asks of the family. Nothing is saved until you confirm.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onFile(e.dataTransfer.files?.[0])
        }}
        className={`flex flex-col gap-4 rounded-2xl border-2 border-dashed p-5 transition-all duration-300 ${
          dragging ? 'scale-[1.01] border-[var(--sand-text)] bg-[var(--surface-raised)] shadow-[0_0_0_6px_var(--ember-soft)]' : 'border-[var(--line-strong)]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id={`${inputId}-file`}
            type="file"
            accept="application/pdf,text/plain,text/markdown,.pdf,.txt,.md"
            className="sr-only"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label
            htmlFor={`${inputId}-file`}
            aria-disabled={busy}
            className={`flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm text-[var(--ink)] transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[var(--sand-text)] ${
              busy ? 'opacity-50' : 'cursor-pointer hover:bg-[var(--surface-raised)]'
            }`}
          >
            <FileUp className={`size-4 transition-transform ${dragging ? '-translate-y-1' : ''}`} aria-hidden />
            Choose a file
          </label>
          <span className="text-sm text-[var(--ink-muted)]">
or drop a PDF or text file here
          </span>
        </div>

        <label>
          <span className="sr-only">Or paste text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Or paste the text here"
            disabled={busy}
            className={`${FIELD} resize-y leading-relaxed`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void read(null)}
            disabled={busy || text.trim().length < 8}
            className="flex items-center gap-2 rounded-full bg-[var(--sand)] px-5 py-2 text-sm font-medium text-[var(--on-sand)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-40"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {busy ? `Reading ${fileName ?? 'the text'}…` : 'Read it'}
          </button>
          <p className="text-xs text-[var(--ink-muted)]">
            {demo
              ? 'The file or text stays on this computer.'
              : 'Bayt turns the file into text on this computer and sends only the text to an NVIDIA model to be read. Bayt does not keep the file.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[var(--ember)]">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
