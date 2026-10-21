'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, Inbox, UserRoundPlus, X } from 'lucide-react'
import { Avatar, CARD, IconBadge } from '@/components/ui/Card'
import { useHandoffs } from '@/lib/hooks/useHandoffs'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import type { Handoff } from '@/types/family'

/**
 * Consent inbox. Bayt only ever proposes; nothing moves until the person it is asked of accepts.
 * Declining changes nothing, and "Suggest someone else" sends a fresh request to the person chosen.
 */
export default function HandoffInbox({
  memberId,
  onAccepted,
}: {
  memberId: string | null
  onAccepted?: (h: Handoff) => void
}) {
  const { pending, loading, busyId, respond } = useHandoffs(memberId, onAccepted)
  const { nameOf, colorOf, members } = useMemberLookup()
  const [choosingId, setChoosingId] = useState<string | null>(null)

  if (!memberId || loading || pending.length === 0) return null

  const answer = async (h: Handoff, action: 'accept' | 'decline' | 'redirect', redirectToId?: string) => {
    const out = await respond(h, action, redirectToId)
    setChoosingId(null)
    if (!out.ok) return toast.error(out.error ?? 'Could not save your answer')
    if (action === 'accept') toast.success(`${h.itemTitle} is now yours. ${nameOf(h.fromId)} stays on as backup.`)
    if (action === 'decline') toast(`Declined. ${nameOf(h.fromId)} keeps ${h.itemTitle}.`)
    if (action === 'redirect' && redirectToId) toast(`Asked ${nameOf(redirectToId)} instead.`)
  }

  return (
    <section aria-labelledby="handoff-inbox-title" className={`${CARD} flex h-full flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Inbox} tone="ember" />
        <h2 id="handoff-inbox-title" className="font-display text-2xl text-[var(--ink)]">
          {pending.length === 1 ? 'Someone is asking for your help' : 'People are asking for your help'}
        </h2>
      </div>

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
        {pending.map((h, n) => {
          const busy = busyId === h.id
          const others = members.filter((m) => m.id !== h.toId && m.id !== h.fromId)
          return (
            <motion.li
              key={h.id}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: n * 0.06 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
              className="rounded-2xl bg-[var(--surface-raised)] p-5"
            >
              <div className="flex items-start gap-3">
                <Avatar name={nameOf(h.fromId)} color={colorOf(h.fromId)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug text-[var(--ink)]">
                    <span className="font-medium">{nameOf(h.fromId)}</span> would like you to take over{' '}
                    <span className="font-medium">{h.itemTitle}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">{h.reason}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => answer(h, 'accept')}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--sand)] px-4 py-1.5 text-sm font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50"
                >
                  <Check className="size-3.5" aria-hidden />
                  Accept
                </button>
                <button
                  onClick={() => answer(h, 'decline')}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50"
                >
                  <X className="size-3.5" aria-hidden />
                  Not now
                </button>
                <button
                  onClick={() => setChoosingId(choosingId === h.id ? null : h.id)}
                  disabled={busy || others.length === 0}
                  aria-expanded={choosingId === h.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)] disabled:opacity-50"
                >
                  <UserRoundPlus className="size-3.5" aria-hidden />
                  Suggest someone else
                </button>
              </div>

              {choosingId === h.id && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Suggest someone else">
                  {others.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => answer(h, 'redirect', m.id)}
                        disabled={busy}
                        className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] py-1 pl-1 pr-3 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
                      >
                        <span
                          className="flex size-6 items-center justify-center rounded-full text-xs font-semibold text-[var(--on-member)]"
                          style={{ background: colorOf(m.id) }}
                          aria-hidden
                        >
                          {m.name[0]}
                        </span>
                        {m.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.li>
          )
        })}
        </AnimatePresence>
      </ul>
    </section>
  )
}
