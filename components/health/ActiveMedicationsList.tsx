import { AlertTriangle, Pill } from 'lucide-react'
import type { Medication } from '@/types'

interface Props {
  medications:  Medication[]
  accentColor:  string
}

export default function ActiveMedicationsList({ medications, accentColor }: Props) {
  return (
    <section
      className="bg-[var(--surface-container-lowest)]"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-6 py-4"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <Pill className="size-3.5" style={{ color: accentColor }} />
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Active Medications · {medications.length}
        </span>
      </div>

      {medications.length === 0 ? (
        <p className="px-6 py-6 font-mono text-xs text-[var(--on-surface-variant)]">
          No active medications recorded.
        </p>
      ) : (
        <ul className="flex flex-col">
          {medications.map((med, i) => {
            const hasInteractions = med.interactions.length > 0
            const isLast = i === medications.length - 1

            return (
              <li
                key={med.id}
                className="flex flex-col gap-2 px-6 py-4"
                style={!isLast ? { borderBottom: '1px solid var(--outline-variant)' } : {}}
              >
                {/* Drug name + dosage row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="text-sm font-bold text-[var(--on-surface)]"
                      style={{ fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      {med.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className="rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                        style={{
                          background: accentColor + '18',
                          color:      accentColor,
                          border:     `1px solid ${accentColor}40`,
                        }}
                      >
                        {med.dosage}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
                        {med.frequency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interaction warnings */}
                {hasInteractions && (
                  <div
                    className="flex flex-col gap-1 rounded-none border-l-2 pl-3"
                    style={{ borderColor: 'var(--tertiary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="size-3 shrink-0 text-[var(--tertiary)]" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--tertiary)]">
                        Interactions
                      </span>
                    </div>
                    {med.interactions.map((interaction, j) => (
                      <span
                        key={j}
                        className="font-mono text-[10px] leading-relaxed text-[var(--on-surface-variant)]"
                      >
                        · {interaction}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
