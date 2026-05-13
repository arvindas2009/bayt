'use client'

import { AlertOctagon, AlertTriangle, Info, Dna } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { useFamilyStore } from '@/store/family-store'

const SEV = {
  critical: { Icon: AlertOctagon, color: 'var(--error)',   border: 'var(--error)',   label: 'CRITICAL', badge: { background: 'var(--error-container)',    color: 'var(--on-error-container)'   } },
  warning:  { Icon: AlertTriangle, color: 'var(--tertiary)', border: 'var(--tertiary)', label: 'WARNING',  badge: { background: '#2e2600',                  color: 'var(--tertiary)'             } },
  info:     { Icon: Info,          color: 'var(--primary)',  border: 'var(--primary)',  label: 'INFO',     badge: { background: 'var(--primary-container)', color: 'var(--on-primary-container)' } },
} as const

const MEMBER_COLORS = ['#3D7FFF', '#cfbcff', '#2ECC8A', '#e7c365', '#e87040']

interface Props {
  memberId: string
}

export default function RelatedFamilyPatterns({ memberId }: Props) {
  const patterns   = useAgentStore((s) => s.agentOutputs.health?.familyPatterns ?? [])
  const members    = useFamilyStore((s) => s.family?.members ?? [])
  const colorById  = Object.fromEntries(members.map((m, i) => [m.id, MEMBER_COLORS[i] ?? 'var(--primary)']))
  const nameById   = Object.fromEntries(members.map((m) => [m.id, m.name.split(' ')[0]]))

  const related = patterns
    .filter((p) => p.affectedMembers.includes(memberId))
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const
      return rank[a.severity] - rank[b.severity]
    })

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
        <Dna className="size-3.5 text-[var(--primary)]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Family Patterns · {related.length} involving this member
        </span>
      </div>

      {related.length === 0 ? (
        <div className="px-6 py-6">
          {patterns.length === 0 ? (
            <p className="font-mono text-xs text-[var(--on-surface-variant)]">
              Run the Health Agent to detect cross-family patterns.
            </p>
          ) : (
            <p className="font-mono text-xs text-[var(--on-surface-variant)]">
              No cross-family patterns involve this member right now.
            </p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col">
          {related.map((pattern, i) => {
            const s      = SEV[pattern.severity]
            const pct    = Math.round(pattern.confidence * 100)
            const isLast = i === related.length - 1
            const others = pattern.affectedMembers.filter((id) => id !== memberId)

            return (
              <li
                key={pattern.id}
                className="flex flex-col gap-3 px-6 py-4"
                style={{
                  borderLeft:   `3px solid ${s.border}`,
                  borderBottom: isLast ? 'none' : '1px solid var(--outline-variant)',
                }}
              >
                {/* Severity badge + confidence */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <s.Icon className="size-3 shrink-0" style={{ color: s.color }} />
                    <span
                      className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                      style={s.badge}
                    >
                      {s.label}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--on-surface-variant)]">
                    {pct}% conf
                  </span>
                </div>

                {/* Title */}
                <div
                  className="text-sm font-bold leading-snug text-[var(--on-surface)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {pattern.title}
                </div>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed text-[var(--on-surface-variant)]"
                  style={{
                    display:         '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow:        'hidden',
                  }}
                >
                  {pattern.description}
                </p>

                {/* Also affects */}
                {others.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
                      Shared with
                    </span>
                    {others.map((id) => {
                      const color = colorById[id] ?? 'var(--primary)'
                      const name  = nameById[id] ?? id
                      return (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                          style={{
                            background: `${color}1a`,
                            color,
                            border: `1px solid ${color}40`,
                          }}
                        >
                          {name.slice(0, 3)}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Recommendation */}
                <p
                  className="border-l-2 pl-2 font-mono text-[10px] leading-relaxed text-[var(--on-surface-variant)]"
                  style={{ borderColor: s.border }}
                >
                  {pattern.recommendation}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
