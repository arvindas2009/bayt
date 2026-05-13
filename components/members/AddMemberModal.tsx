'use client'

import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFamilyStore } from '@/store/family-store'
import type { FamilyMember } from '@/types'

const INPUT_CLASS = 'w-full rounded-xl px-3 py-2.5 text-sm text-[var(--on-surface)] bg-[var(--surface-container-high)] border border-[var(--outline-variant)] focus:outline-none focus:border-[var(--primary)] transition-colors'
const LABEL_CLASS = 'font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-1.5 block'

interface Props {
  onClose: () => void
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed])
    setInput('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={INPUT_CLASS}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Type and press Enter'}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]"
              style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddMemberModal({ onClose }: Props) {
  const { family, addMember } = useFamilyStore()

  const [name, setName]             = useState('')
  const [age, setAge]               = useState('')
  const [role, setRole]             = useState<'parent' | 'child' | 'grandparent'>('child')
  const [dietaryNeeds, setDietary]  = useState<string[]>([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function handleSave() {
    if (!name.trim() || !age) {
      setError('Name and age are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/family/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: family?.id,
          name: name.trim(),
          age: Number(age),
          role,
          dietaryNeeds,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const member: FamilyMember = await res.json()
      addMember(member)
      onClose()
    } catch {
      // Optimistic add
      const tempMember: FamilyMember = {
        id: `temp-${Date.now()}`,
        name: name.trim(),
        age: Number(age),
        role,
        avatarSeed: name.toLowerCase().replace(/\s+/g, '-'),
        dietaryNeeds,
        medications: [],
        calendarEvents: [],
      }
      addMember(tempMember)
      onClose()
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
              <UserPlus className="size-4 text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                Add Family Member
              </span>
            </div>
            <button onClick={onClose} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={LABEL_CLASS}>Full Name</label>
                <input
                  className={INPUT_CLASS}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Omar Al-Salem"
                  autoFocus
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Age</label>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 8"
                  min={0}
                  max={120}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Role</label>
                <select
                  className={INPUT_CLASS}
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="grandparent">Grandparent</option>
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>Dietary Restrictions</label>
              <ChipInput
                values={dietaryNeeds}
                onChange={setDietary}
                placeholder="e.g. Gluten-free, Nut allergy"
              />
            </div>

            {error && (
              <p className="font-mono text-[11px] text-[var(--error)]">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 pb-6">
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
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
