'use client'

import { format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import type { LabResult } from '@/types'
import { parseRange } from '@/lib/health/range'
import { useMotionOK } from '@/lib/hooks/useMotionOK'
import StatusChip from './StatusChip'

const WORD: Record<LabResult['status'], string> = { normal: 'In range', monitor: 'Keep an eye on it', alert: 'Out of range' }
const STATUS: Record<LabResult['status'], 'good' | 'monitor' | 'alert'> = { normal: 'good', monitor: 'monitor', alert: 'alert' }
const MARKER: Record<LabResult['status'], string> = { normal: 'var(--palm)', monitor: 'var(--zest)', alert: 'var(--ember)' }
const RANK: Record<LabResult['status'], number> = { alert: 0, monitor: 1, normal: 2 }

function day(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy')
  } catch {
    return iso.slice(0, 10)
  }
}

/** The recorded value on its reference range. Decorative: the value, range and status are also in text. */
function RangeBar({ result }: { result: LabResult }) {
  const motionOK = useMotionOK()
  const scale = parseRange(result.referenceRange, result.value)
  if (!scale) return null
  const [a, b] = scale.band
  return (
    <div aria-hidden className="relative mt-3 h-3 w-full rounded-full bg-[var(--surface-high)]">
      <motion.span
        className="absolute inset-y-0 rounded-full bg-[var(--palm)] opacity-35"
        style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%`, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)]"
        style={{ background: MARKER[result.status], left: `${scale.marker * 100}%` }}
        initial={motionOK ? { left: '0%', opacity: 0 } : false}
        whileInView={{ left: `${scale.marker * 100}%`, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.2 }}
      />
    </div>
  )
}

/** The latest results, the ones that need attention first. Status is in words as well as colour. */
export default function LabResultsTable({ labResults }: { labResults: LabResult[] }) {
  if (labResults.length === 0) return <p className="py-3 text-base text-[var(--ink-muted)]">No lab results on record.</p>
  const sorted = [...labResults].sort((a, b) => RANK[a.status] - RANK[b.status] || b.date.localeCompare(a.date))

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {sorted.map((l) => (
        <li key={`${l.test}-${l.date}`} className="rounded-2xl bg-[var(--surface-raised)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ink)]">{l.test}</p>
              <p className="text-xs text-[var(--ink-muted)]">{day(l.date)}</p>
            </div>
            <StatusChip status={STATUS[l.status]} label={WORD[l.status]} />
          </div>
          <p className="mt-3 text-[var(--ink)]">
            <span className={`num text-3xl ${l.status === 'alert' ? 'text-[var(--ember)]' : ''}`}>{l.value}</span>{' '}
            <span className="text-sm text-[var(--ink-muted)]">{l.unit}</span>
          </p>
          <RangeBar result={l} />
          <p className="mt-2 text-xs text-[var(--ink-muted)]">Reference range {l.referenceRange}</p>
        </li>
      ))}
    </ul>
  )
}
