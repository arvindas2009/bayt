import type { LabResult } from '@/types'

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  normal:  { color: '#2ECC8A',       label: 'Normal'  },
  monitor: { color: 'var(--tertiary)', label: 'Monitor' },
  alert:   { color: 'var(--error)',    label: 'Alert'   },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

interface Props {
  labResults: LabResult[]
}

export default function LabResultsTable({ labResults }: Props) {
  if (labResults.length === 0) {
    return (
      <section
        className="bg-[var(--surface-container-lowest)]"
        style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div className="px-6 py-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            Lab Results
          </span>
        </div>
        <p className="px-6 pb-6 font-mono text-xs text-[var(--on-surface-variant)]">
          No lab results on record.
        </p>
      </section>
    )
  }

  // Sort: alert first, then monitor, then normal; within each group by date desc
  const ranked = { alert: 0, monitor: 1, normal: 2 }
  const sorted = [...labResults].sort((a, b) => {
    const r = ranked[a.status] - ranked[b.status]
    if (r !== 0) return r
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Lab Results · {labResults.length} entries
        </span>
        <div className="flex items-center gap-4">
          {(['normal', 'monitor', 'alert'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="size-2 rounded-full" style={{ background: STATUS_DOT[s].color }} />
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--on-surface-variant)]">
                {STATUS_DOT[s].label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
              {['Test', 'Value', 'Reference Range', 'Date', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lab, i) => {
              const s = STATUS_DOT[lab.status] ?? STATUS_DOT.normal
              const isLast = i === sorted.length - 1
              return (
                <tr
                  key={`${lab.test}-${lab.date}`}
                  className="transition-colors hover:bg-[var(--surface-container)]"
                  style={!isLast ? { borderBottom: '1px solid var(--outline-variant)' } : {}}
                >
                  {/* Test name */}
                  <td className="px-6 py-3">
                    <span
                      className="text-sm font-medium text-[var(--on-surface)]"
                      style={{ fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      {lab.test}
                    </span>
                  </td>

                  {/* Value */}
                  <td className="px-6 py-3">
                    <span className="font-mono text-sm tabular-nums" style={{ color: s.color }}>
                      {lab.value}
                      {lab.unit && (
                        <span className="ml-1 text-[10px] text-[var(--on-surface-variant)]">
                          {lab.unit}
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Reference range */}
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                      {lab.referenceRange}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs tabular-nums text-[var(--on-surface-variant)]">
                      {formatDate(lab.date)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
