'use client'

import type { InvisibleHoursReport } from '@/types/agents'
import type { FamilyMember } from '@/types/family'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  medical_admin:        { label: 'Medical Admin',    color: '#ffb4ab' },
  school_admin:         { label: 'School Admin',     color: '#cfbcff' },
  logistics:            { label: 'Logistics',        color: '#cdc0e9' },
  conflict_resolution:  { label: 'Conflict Res.',   color: '#e7c365' },
  medication_management:{ label: 'Medication Mgmt', color: '#6cd5a0' },
}

const CATEGORY_ORDER = [
  'medical_admin',
  'medication_management',
  'school_admin',
  'conflict_resolution',
  'logistics',
]

interface Props {
  report: InvisibleHoursReport
  members: FamilyMember[]
}

export default function InvisibleHoursBreakdown({ report, members }: Props) {
  const primaryCaregiver = members.find((m) => m.id === report.primaryCaregiverId)
  const caregiverName = primaryCaregiver?.name ?? 'primary caregiver'

  const orderedCategories = CATEGORY_ORDER.filter((k) => k in report.breakdown)
  const totalHours = report.totalHours

  return (
    <div
      style={{
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Invisible Hours · Week of {report.weekOf}
        </span>
        {report.comparisonToAverage > 20 && (
          <span
            className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5"
            style={{
              color: '#e7c365',
              background: 'rgba(231,195,101,0.1)',
              border: '1px solid rgba(231,195,101,0.3)',
            }}
          >
            ↑ {report.comparisonToAverage}% above average load
          </span>
        )}
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Headline */}
        <div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-bold leading-none"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: 48,
                color: 'var(--on-surface)',
              }}
            >
              {totalHours}
            </span>
            <span
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              invisible hours this week
            </span>
          </div>
          <p
            className="mt-1 font-mono text-[11px] uppercase tracking-widest"
            style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}
          >
            None of this appeared in {caregiverName}&apos;s calendar
          </p>
        </div>

        {/* Segmented bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-none gap-px">
          {totalHours > 0 &&
            orderedCategories.map((key) => {
              const entry = report.breakdown[key]
              if (!entry || entry.hours === 0) return null
              const pct = (entry.hours / totalHours) * 100
              const meta = CATEGORY_META[key] ?? { color: 'var(--primary)' }
              return (
                <div
                  key={key}
                  title={`${meta.label}: ${entry.hours}h`}
                  style={{ width: `${pct}%`, background: meta.color, flexShrink: 0 }}
                />
              )
            })}
        </div>

        {/* Legend dots */}
        <div className="flex flex-wrap gap-4">
          {orderedCategories.map((key) => {
            const meta = CATEGORY_META[key]
            if (!meta) return null
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ background: meta.color }}
                />
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {orderedCategories.map((key) => {
            const entry = report.breakdown[key]
            const meta = CATEGORY_META[key]
            if (!entry || !meta) return null
            return (
              <div
                key={key}
                className="flex flex-col gap-1 p-3"
                style={{
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                  borderTop: `2px solid ${meta.color}`,
                }}
              >
                <span
                  className="font-bold leading-none"
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: 20,
                    color: meta.color,
                  }}
                >
                  {entry.hours}h
                </span>
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  {entry.taskCount} {key === 'medication_management' ? 'medications' : 'tasks'}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--on-surface)', opacity: 0.8 }}
                >
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
