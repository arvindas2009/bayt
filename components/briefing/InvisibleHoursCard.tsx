'use client'

import { AlertTriangle } from 'lucide-react'
import type { InvisibleHoursReport } from '@/types/agents'
import type { FamilyMember } from '@/types/family'

interface Props {
  report: InvisibleHoursReport
  members: FamilyMember[]
}

export default function InvisibleHoursCard({ report, members }: Props) {
  const caregiver = members.find((m) => m.id === report.primaryCaregiverId)
  const name = caregiver?.name ?? 'your primary caregiver'
  const isOverloaded = report.comparisonToAverage > 20

  return (
    <div
      style={{
        background: 'var(--surface-container)',
        border: '1px solid var(--outline-variant)',
        borderLeft: '3px solid var(--error)',
      }}
    >
      <div className="px-5 py-4 flex flex-col gap-2">
        <span
          className="font-mono text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Caregiver · Invisible Hours
        </span>

        <div className="flex items-baseline gap-2">
          <span
            className="font-bold leading-none"
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: 52,
              color: 'var(--on-surface)',
              letterSpacing: '-0.02em',
            }}
          >
            {report.totalHours}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            hrs this week
          </span>
        </div>

        <p
          className="font-mono text-[10px] uppercase tracking-widest leading-relaxed"
          style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}
        >
          None of this appeared in {name}&apos;s calendar
        </p>

        {isOverloaded && (
          <div
            className="flex items-center gap-1.5 mt-1"
          >
            <AlertTriangle className="size-2.5 shrink-0" style={{ color: '#e7c365' }} />
            <span
              className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: '#e7c365' }}
            >
              {report.comparisonToAverage}% above average load
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
