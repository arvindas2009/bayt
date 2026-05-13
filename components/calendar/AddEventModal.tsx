'use client'

import { useState } from 'react'
import { X, CalendarPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFamilyStore } from '@/store/family-store'
import { useAgentStore } from '@/store/agent-store'
import type { CalendarEvent } from '@/types'

const CATEGORIES = [
  'Education', 'Work', 'Health', 'Medical',
  'Extracurricular', 'Social', 'Family', 'Caregiving', 'Travel', 'Chores',
]

interface Props {
  onClose: () => void
}

const INPUT_CLASS = 'w-full rounded-xl px-3 py-2.5 text-sm text-[var(--on-surface)] bg-[var(--surface-container-high)] border border-[var(--outline-variant)] focus:outline-none focus:border-[var(--primary)] transition-colors'
const LABEL_CLASS = 'font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-1.5 block'

export default function AddEventModal({ onClose }: Props) {
  const { family, addEvent } = useFamilyStore()
  const { runAgent } = useAgentStore()
  const members = family?.members ?? []

  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState('')
  const [category, setCategory] = useState('Family')
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSave() {
    if (!title.trim() || !date || !memberId) {
      setError('Please fill in all fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/family/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, title: title.trim(), date, category }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const event: CalendarEvent = await res.json()
      addEvent(memberId, event)
      onClose()
      // Re-run operations agent to detect any new conflicts with this event
      runAgent('operations')
    } catch {
      // Optimistic update even if DB fails (prototype)
      const tempEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        memberId,
        title: title.trim(),
        date,
        category,
        conflict: false,
      }
      addEvent(memberId, tempEvent)
      onClose()
      runAgent('operations')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md flex flex-col"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderTop: '3px solid var(--primary)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
            <div className="flex items-center gap-2.5">
              <CalendarPlus className="size-4 text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                Add Calendar Event
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4 p-6">
            <div>
              <label className={LABEL_CLASS}>Event Title</label>
              <input
                className={INPUT_CLASS}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Doctor's appointment"
                autoFocus
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Date & Time</label>
              <input
                type="datetime-local"
                className={INPUT_CLASS}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Category</label>
                <select
                  className={INPUT_CLASS}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Family Member</label>
                <select
                  className={INPUT_CLASS}
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="font-mono text-[11px] text-[var(--error)]">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 pb-6 pt-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors"
              style={{ border: '1px solid var(--outline-variant)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
            >
              {saving ? 'Saving…' : 'Add Event'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
