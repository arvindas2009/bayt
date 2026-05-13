'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, X, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { SchoolDraft } from '@/types'

// ─── Draft dialog ─────────────────────────────────────────────────────────────

interface DialogProps {
  draft: SchoolDraft | null
  onClose: () => void
}

function DraftDialog({ draft, onClose }: DialogProps) {
  const [body, setBody] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Sync body whenever a new draft is selected
  useEffect(() => {
    if (draft) setBody(draft.body)
  }, [draft?.memberId, draft?.subject]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )
  useEffect(() => {
    if (!draft) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [draft, handleKey])

  const handleSend = () => {
    toast.success('Email queued for review', {
      description: `Ready to send to ${draft?.to}`,
    })
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {draft && (
        <motion.div
          key="draft-dialog"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              className="pointer-events-auto flex w-full max-w-lg flex-col"
              initial={{ y: 14, scale: 0.96 }}
              animate={{ y: 0,  scale: 1 }}
              exit={{ y: 8,  scale: 0.97 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{
                background:  'var(--surface-container-highest)',
                border:      '1px solid var(--outline-variant)',
                maxHeight:   '85vh',
              }}
            >
              {/* Header */}
              <div
                className="flex items-start justify-between p-5"
                style={{ borderBottom: '1px solid var(--outline-variant)' }}
              >
                <div className="min-w-0 flex-1 pr-4">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    To: {draft.to}
                  </p>
                  <h2
                    className="truncate text-base font-bold text-[var(--on-surface)]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {draft.subject}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-1 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Editable body */}
              <div className="flex-1 overflow-y-auto p-5">
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="min-h-[240px] w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)]"
                  placeholder="Email body…"
                  spellCheck
                />
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 p-5"
                style={{ borderTop: '1px solid var(--outline-variant)' }}
              >
                <button
                  onClick={onClose}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="flex items-center gap-2 px-5 py-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
                  style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
                >
                  <Send className="size-3.5" />
                  Send
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─── Draft row ────────────────────────────────────────────────────────────────

function DraftRow({
  draft,
  onReview,
}: {
  draft: SchoolDraft
  onReview: () => void
}) {
  return (
    <div className="py-4">
      {/* Recipient + subject */}
      <div className="mb-2 flex items-start gap-3">
        <Mail className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--on-surface)]">
            {draft.subject}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            To: {draft.to}
          </p>
        </div>
      </div>

      {/* 2-line body preview */}
      <p className="mb-3 ml-7 line-clamp-2 text-sm leading-relaxed text-[var(--on-surface-variant)]">
        {draft.preview}
      </p>

      {/* Review & Send button */}
      <button
        onClick={onReview}
        className="ml-7 flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
        style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
      >
        <Send className="size-3" />
        Review &amp; Send
      </button>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="h-px w-full" style={{ background: 'var(--outline-variant)', opacity: 0.35 }} />
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
        <BookOpen className="size-6 text-[var(--on-surface-variant)] opacity-60" />
      </div>
      <p className="text-base font-medium text-[var(--on-surface)]">
        No drafts this week.
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        All school comms are up to date.
      </p>
    </div>
  )
}

// ─── SchoolAdminDrafts ────────────────────────────────────────────────────────

interface Props {
  drafts: SchoolDraft[]
}

export default function SchoolAdminDrafts({ drafts }: Props) {
  const [selected, setSelected] = useState<SchoolDraft | null>(null)

  return (
    <>
      <section
        className="bg-[var(--surface-container-lowest)] p-6"
        style={{
          borderTop:    '1px solid var(--outline-variant)',
          borderBottom: '1px solid var(--outline-variant)',
        }}
      >
        <header className="mb-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            School Admin Drafts
          </span>
        </header>

        {drafts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul>
            {drafts.map((d, i) => (
              <li key={`${d.memberId}-${i}`}>
                <DraftRow draft={d} onReview={() => setSelected(d)} />
                {i < drafts.length - 1 && <Divider />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <DraftDialog draft={selected} onClose={() => setSelected(null)} />
    </>
  )
}
