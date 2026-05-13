'use client'

import { useEffect, useState } from 'react'
import { Lock, LockOpen, ShieldAlert } from 'lucide-react'

type VaultStatus = 'disabled' | 'active' | 'offline' | 'loading'

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

  const active = status === 'active'
  const disabled = status === 'disabled'

  const styles = disabled
    ? 'bg-white/5 border-white/10 text-[var(--text-disabled,#555)]'
    : active
      ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400'
      : 'bg-amber-950/40 border-amber-700/50 text-amber-400'

  const Icon = disabled ? LockOpen : active ? Lock : ShieldAlert

  const tooltips: Record<VaultStatus, string> = {
    loading: '',
    disabled: 'Privacy Vault is off — health data goes to Gemini. Click to enable local Ollama.',
    active: 'Privacy Vault active — health AI runs locally. Click to disable.',
    offline: 'Privacy Vault enabled but Ollama is offline. Click to disable.',
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      title={tooltips[status]}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border transition-opacity',
        styles,
        toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-80',
      ].join(' ')}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>
        {disabled ? 'Vault: Off' : active ? 'Vault: Active' : 'Vault: Offline'}
      </span>
    </button>
  )
}
