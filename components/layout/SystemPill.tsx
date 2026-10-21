'use client'

import { useCallback, useRef, useState } from 'react'
import { isDemoMode } from '@/lib/demo/mode'
import { useAgentStore } from '@/store/agent-store'
import { useDismiss } from '@/lib/hooks/useDismiss'
import type { AgentName, AgentStatus } from '@/types'
import PrivacyVaultBadge from './PrivacyVaultBadge'

const AGENTS: { key: AgentName; label: string }[] = [
  { key: 'operations', label: 'Operations' },
  { key: 'health', label: 'Health' },
  { key: 'connection', label: 'Connection' },
  { key: 'caregiver', label: 'Load' },
]

const STATUS_COPY: Record<AgentStatus, string> = {
  live: 'Live',
  thinking: 'Working',
  preview: 'Preview: model unavailable, using built-in logic',
  idle: 'Standing by',
}

const SUMMARY_LABEL: Record<AgentStatus, string> = {
  live: 'Live',
  thinking: 'Working',
  preview: 'Preview',
  idle: 'Ready',
}

const DOT: Record<AgentStatus, string> = {
  live: 'bg-[var(--palm)]',
  thinking: 'bg-[var(--sand)] animate-pulse',
  preview: 'bg-[var(--sand)]',
  idle: 'bg-[var(--ink-muted)]',
}

/**
 * One pill instead of a row of agent dots. The label is the honest summary (Demo, Working,
 * Preview, Live, Ready); the popover has the detail: each agent, the vault mode, the data source.
 */
export default function SystemPill() {
  const statuses = useAgentStore((s) => s.agentStatuses)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const values = Object.values(statuses)
  const summary: AgentStatus = isDemoMode
    ? 'preview'
    : values.includes('thinking')
      ? 'thinking'
      : values.includes('preview')
        ? 'preview'
        : values.includes('live')
          ? 'live'
          : 'idle'
  const label = isDemoMode ? 'Demo' : SUMMARY_LABEL[summary]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)]"
      >
        <span className={`size-2 rounded-full ${DOT[summary]}`} aria-hidden />
        <span>{label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="System status"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-4 shadow-2xl"
        >
          <p className="font-statement text-base text-[var(--ink)]">System</p>

          <ul className="mt-3 flex flex-col gap-2">
            {AGENTS.map(({ key, label: name }) => (
              <li key={key} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[statuses[key]]}`} aria-hidden />
                <span className="min-w-0">
                  <span className="text-[var(--ink)]">{name}</span>
                  <span className="block text-xs text-[var(--ink-muted)]">{STATUS_COPY[statuses[key]]}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-[var(--line)]" />
          <PrivacyVaultBadge />

          <div className="my-4 border-t border-[var(--line)]" />
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            {isDemoMode
              ? 'Demo mode: no model calls are made. Every number is still computed from the seeded family.'
              : 'Numbers are computed from your family’s data. Models only write the wording.'}
          </p>
        </div>
      )}
    </div>
  )
}
