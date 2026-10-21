'use client'

import { useEffect, useState } from 'react'
import { Lock, LockOpen, ShieldAlert } from 'lucide-react'

type VaultStatus = 'disabled' | 'active' | 'offline' | 'loading'

const COPY: Record<Exclude<VaultStatus, 'loading'>, { label: string; body: string }> = {
  disabled: {
    label: 'Cloud mode',
    body: 'Health analysis uses Gemini. Switch to the local vault to keep health data on this machine.',
  },
  active: {
    label: 'Local vault active',
    body: 'Health analysis runs on this machine. Nothing health-related is sent to the cloud.',
  },
  offline: {
    label: 'Local model offline',
    body: 'The vault is on but Ollama is not running, so health analysis is paused. It will not fall back to the cloud.',
  },
}

/** The privacy-vault row inside the System popover: current mode, what it means, and the switch. */
export default function PrivacyVaultBadge() {
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [toggling, setToggling] = useState(false)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/privacy/status', { cache: 'no-store' })
      const data = await res.json()
      setStatus(data.status as VaultStatus)
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 30_000)
    return () => clearInterval(id)
  }, [])

  async function toggle() {
    if (toggling || status === 'loading') return
    setToggling(true)
    try {
      const res = await fetch('/api/privacy/status', { method: 'POST', cache: 'no-store' })
      const data = await res.json()
      setStatus(data.status as VaultStatus)
    } catch {
      // keep current status on error
    } finally {
      setToggling(false)
    }
  }

  if (status === 'loading') return null

  const Icon = status === 'disabled' ? LockOpen : status === 'active' ? Lock : ShieldAlert
  // Cloud mode is a normal, neutral state. Ember is reserved for "vault on but the local model is down".
  const tone = status === 'active' ? 'text-[var(--palm)]' : status === 'offline' ? 'text-[var(--ember)]' : 'text-[var(--ink-muted)]'
  const { label, body } = COPY[status]

  return (
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${tone}`}>{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-muted)]">{body}</p>
      </div>
      <button
        onClick={toggle}
        disabled={toggling}
        className="shrink-0 rounded-md border border-[var(--line-strong)] px-2.5 py-1 text-xs text-[var(--ink)] transition-colors hover:bg-[var(--surface-high)] disabled:cursor-wait disabled:opacity-50"
      >
        {status === 'disabled' ? 'Use local vault' : 'Use cloud'}
      </button>
    </div>
  )
}
