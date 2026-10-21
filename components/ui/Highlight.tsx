'use client'

import { useMemo } from 'react'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { segment } from '@/lib/text/highlight'

/**
 * A sentence with its people, titles, times and figures picked out, so a briefing line reads at a
 * glance instead of as a paragraph. People get a soft pill in their member colour (looked up by
 * id); the words stay ink, so contrast never depends on the tint.
 */
export default function Highlight({ text, className = '' }: { text: string; className?: string }) {
  const { members, colorOf } = useMemberLookup()
  const parts = useMemo(() => segment(text, members.map((m) => ({ id: m.id, name: m.name }))), [text, members])

  return (
    <span className={className}>
      {parts.map((p, i) => {
        switch (p.kind) {
          case 'person': {
            const color = p.memberId ? colorOf(p.memberId) : 'var(--surface-high)'
            return (
              <span
                key={i}
                className="whitespace-nowrap rounded-lg px-1.5 font-semibold text-[var(--ink)] [box-decoration-break:clone]"
                style={{ background: `color-mix(in oklab, ${color} 26%, transparent)`, boxShadow: `inset 0 -2px 0 ${color}` }}
              >
                {p.text}
              </span>
            )
          }
          case 'title':
            return (
              <span key={i} className="font-semibold text-[var(--ink)] underline decoration-[var(--line-strong)] decoration-2 underline-offset-4">
                {p.text}
              </span>
            )
          case 'when':
            return (
              <span key={i} className="whitespace-nowrap font-semibold text-[var(--dusk)]">
                {p.text}
              </span>
            )
          case 'figure':
            return (
              <span key={i} className="num whitespace-nowrap font-semibold text-[var(--sand-text)]">
                {p.text}
              </span>
            )
          default:
            return <span key={i}>{p.text}</span>
        }
      })}
    </span>
  )
}
