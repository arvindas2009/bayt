'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useFamilyStore } from '@/store/family-store'
import { useAgentStore } from '@/store/agent-store'
import type { FamilyMember, Medication, MemberPreferences } from '@/types'

// ─── Shared input styles ──────────────────────────────────────────────────────

const INPUT = 'w-full rounded-xl px-3 py-2 text-sm text-[var(--on-surface)] bg-[var(--surface-container-high)] border border-[var(--outline-variant)] focus:outline-none focus:border-[var(--primary)] transition-colors'
const LABEL = 'font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] mb-1.5 block'

// ─── Chip input ───────────────────────────────────────────────────────────────

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function commit() {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={INPUT}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() } }}
          placeholder={placeholder ?? 'Type and press Enter'}
        />
        <button
          type="button"
          onClick={commit}
          className="flex items-center gap-1 px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', color: 'var(--on-surface-variant)' }}
        >
          <Plus className="size-3" />
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
                className="opacity-50 hover:opacity-100 text-sm leading-none"
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

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = 'profile' | 'health' | 'diet' | 'calendar'
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile',  label: 'Profile' },
  { id: 'health',   label: 'Health' },
  { id: 'diet',     label: 'Diet & Prefs' },
  { id: 'calendar', label: 'Calendar' },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  member: FamilyMember
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberEditModal({ member, onClose }: Props) {
  const { updateMember, removeEvent } = useFamilyStore()
  const { runAgent } = useAgentStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Form state ──
  const [name, setName] = useState(member.name)
  const [age, setAge]   = useState(String(member.age))
  const [role, setRole] = useState(member.role)

  const [conditions, setConditions] = useState<string[]>(member.healthProfile?.conditions ?? [])
  const [riskFlags, setRiskFlags]   = useState<string[]>(member.healthProfile?.riskFlags ?? [])
  const [medications, setMedications] = useState<Omit<Medication, 'id' | 'memberId'>[]>(
    member.medications.map(({ name, dosage, frequency, interactions }) => ({
      name, dosage, frequency, interactions,
    }))
  )

  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>(member.dietaryNeeds)
  const [foodLikes, setFoodLikes]       = useState<string[]>(member.preferences?.foodLikes ?? [])
  const [foodDislikes, setFoodDislikes] = useState<string[]>(member.preferences?.foodDislikes ?? [])
  const [notes, setNotes]               = useState(member.preferences?.notes ?? '')

  // ── Upcoming events for calendar tab ──
  const upcomingEvents = [...member.calendarEvents]
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  function updateMed(i: number, field: keyof Omit<Medication, 'id' | 'memberId'>, value: string) {
    setMedications((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function addMed() {
    setMedications((prev) => [...prev, { name: '', dosage: '', frequency: '', interactions: [] }])
  }

  function removeMed(i: number) {
    setMedications((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleDeleteEvent(eventId: string) {
    removeEvent(member.id, eventId)
    try {
      await fetch(`/api/family/events?id=${eventId}`, { method: 'DELETE' })
    } catch {
      // Silently ignore — store is already updated optimistically
    }
  }

  async function handleSave() {
    if (!name.trim() || !age) {
      setError('Name and age are required.')
      return
    }
    setSaving(true)
    setError('')

    const preferences: MemberPreferences = { foodLikes, foodDislikes, notes }

    const updated: Partial<FamilyMember> = {
      name: name.trim(),
      age: Number(age),
      role,
      dietaryNeeds,
      preferences,
      healthProfile: member.healthProfile
        ? { ...member.healthProfile, conditions, riskFlags }
        : undefined,
      medications: medications
        .filter((m) => m.name.trim())
        .map((m, i) => ({ ...m, id: member.medications[i]?.id ?? `new-${i}`, memberId: member.id })),
    }

    updateMember(member.id, updated)

    try {
      await fetch(`/api/family/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          age: updated.age,
          role: updated.role,
          dietaryNeeds,
          preferences,
          healthProfile: { conditions, riskFlags },
          medications: medications.filter((m) => m.name.trim()),
        }),
      })
    } catch {
      // Store is already updated; DB sync failed silently
    }

    setSaving(false)
    onClose()
    // Re-run health agent so new conditions/medications appear in the analysis
    runAgent('health')
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
          className="relative w-full max-w-2xl flex flex-col max-h-[90vh]"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderTop: '3px solid var(--primary)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
            <div>
              <p className="text-base font-bold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                {member.name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                Edit profile
              </p>
            </div>
            <button onClick={onClose} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 px-6 pt-4 gap-1" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '0' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors rounded-t-lg"
                style={{
                  background: activeTab === tab.id ? 'var(--primary-container)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {/* ── Profile ── */}
            {activeTab === 'profile' && (
              <>
                <div>
                  <label className={LABEL}>Full Name</label>
                  <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Age</label>
                    <input type="number" className={INPUT} value={age} onChange={(e) => setAge(e.target.value)} min={0} max={120} />
                  </div>
                  <div>
                    <label className={LABEL}>Role</label>
                    <select
                      className={INPUT}
                      value={role}
                      onChange={(e) => setRole(e.target.value as FamilyMember['role'])}
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="parent">Parent</option>
                      <option value="child">Child</option>
                      <option value="grandparent">Grandparent</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── Health ── */}
            {activeTab === 'health' && (
              <>
                <div>
                  <label className={LABEL}>Health Conditions</label>
                  <ChipInput values={conditions} onChange={setConditions} placeholder="e.g. Type 2 Diabetes" />
                </div>

                <div>
                  <label className={LABEL}>Risk Flags</label>
                  <ChipInput values={riskFlags} onChange={setRiskFlags} placeholder="e.g. Fall risk, EpiPen expiring" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={LABEL} style={{ marginBottom: 0 }}>Medications</label>
                    <button
                      type="button"
                      onClick={addMed}
                      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] hover:opacity-70 transition-opacity"
                    >
                      <Plus className="size-3" />
                      Add
                    </button>
                  </div>

                  {medications.length === 0 && (
                    <p className="text-sm text-[var(--on-surface-variant)]">No medications. Click Add to add one.</p>
                  )}

                  <div className="flex flex-col gap-3">
                    {medications.map((med, i) => (
                      <div
                        key={i}
                        className="flex gap-2 items-start p-3"
                        style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            className={INPUT}
                            value={med.name}
                            onChange={(e) => updateMed(i, 'name', e.target.value)}
                            placeholder="Medication name"
                          />
                          <input
                            className={INPUT}
                            value={med.dosage}
                            onChange={(e) => updateMed(i, 'dosage', e.target.value)}
                            placeholder="Dosage"
                          />
                          <input
                            className={INPUT}
                            value={med.frequency}
                            onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                            placeholder="Frequency"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMed(i)}
                          className="text-[var(--on-surface-variant)] hover:text-[var(--error)] transition-colors mt-2.5"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Diet & Preferences ── */}
            {activeTab === 'diet' && (
              <>
                <div>
                  <label className={LABEL}>Dietary Restrictions</label>
                  <ChipInput values={dietaryNeeds} onChange={setDietaryNeeds} placeholder="e.g. Gluten-free, Nut allergy" />
                </div>
                <div>
                  <label className={LABEL}>Food Likes</label>
                  <ChipInput values={foodLikes} onChange={setFoodLikes} placeholder="e.g. Grilled chicken, Hummus" />
                </div>
                <div>
                  <label className={LABEL}>Food Dislikes</label>
                  <ChipInput values={foodDislikes} onChange={setFoodDislikes} placeholder="e.g. Spicy food, Olives" />
                </div>
                <div>
                  <label className={LABEL}>Additional Notes</label>
                  <textarea
                    className={INPUT}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any other food preferences, allergies, or dietary notes…"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            {/* ── Calendar ── */}
            {activeTab === 'calendar' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    Upcoming Events ({upcomingEvents.length})
                  </p>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Calendar className="size-8 text-[var(--on-surface-variant)] opacity-40" />
                    <p className="text-sm text-[var(--on-surface-variant)]">No upcoming events for {member.name}.</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                      Add events from the Operations page.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--on-surface)] truncate">{event.title}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--on-surface-variant)]">
                            {format(parseISO(event.date), 'MMM d, yyyy · HH:mm')} · {event.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-[var(--on-surface-variant)] hover:text-[var(--error)] transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="font-mono text-[11px] text-[var(--error)]">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--outline-variant)' }}>
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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
