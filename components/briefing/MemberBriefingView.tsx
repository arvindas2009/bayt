'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { Zap, BookOpen } from 'lucide-react'
import type { MemberBriefing, MemberBriefingInsight, AgentName, CapturedMemory } from '@/types/agents'
import type { FamilyMember } from '@/types'

// ─── Token maps ───────────────────────────────────────────────────────────────

const AGENT_DOT: Record<AgentName, string> = {
  operations: '#3D7FFF',
  health:     '#2ECC8A',
  connection: 'var(--primary)',
  caregiver:  'var(--tertiary)',
}

const AGENT_LABEL: Record<AgentName, string> = {
  operations: 'OPS',
  health:     'HEALTH',
  connection: 'CONN',
  caregiver:  'CARE',
}

// ─── Insight row ──────────────────────────────────────────────────────────────

function InsightRow({
  insight,
  index,
  large,
}: {
  insight: MemberBriefingInsight
  index: number
  large: boolean
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      className="flex items-start gap-4"
    >
      <div
        className="mt-[7px] size-2 shrink-0"
        style={{ background: AGENT_DOT[insight.agent] }}
      />
      <div className="flex flex-1 flex-col gap-1">
        <p
          className={`${large ? 'text-lg' : 'text-base'} leading-relaxed text-[var(--on-surface)]`}
        >
          {insight.text}
        </p>
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: AGENT_DOT[insight.agent], opacity: 0.75 }}
        >
          {AGENT_LABEL[insight.agent]}
        </span>
      </div>
    </motion.li>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  memberBriefing: MemberBriefing
  member: FamilyMember
  memoryOfTheDay?: CapturedMemory
}

export default function MemberBriefingView({ memberBriefing, member, memoryOfTheDay }: Props) {
  const isGrandparent = member.role === 'grandparent'
  const sorted = [...memberBriefing.insights].sort((a, b) => a.priority - b.priority)

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop:    '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Greeting */}
      <header className="mb-5">
        <p
          className={`font-bold text-[var(--on-surface)] ${isGrandparent ? 'text-xl' : 'text-lg'}`}
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {memberBriefing.greeting}
        </p>
      </header>

      {/* One action card */}
      <div
        className="mb-6 flex items-start gap-3 p-4"
        style={{
          background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        <Zap
          className="mt-0.5 size-4 shrink-0"
          style={{ color: 'var(--primary)' }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
            Today's priority
          </span>
          <p
            className={`leading-snug text-[var(--on-surface)] ${isGrandparent ? 'text-base' : 'text-sm'}`}
          >
            {memberBriefing.oneAction}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className="mb-5 h-px w-full"
        style={{ background: 'var(--outline-variant)', opacity: 0.4 }}
      />

      {/* Insights */}
      <ul className="space-y-0">
        {sorted.map((insight, i) => (
          <Fragment key={i}>
            <InsightRow insight={insight} index={i} large={isGrandparent} />
            {i < sorted.length - 1 && (
              <div
                className="my-4 h-px w-full"
                style={{ background: 'var(--outline-variant)', opacity: 0.3 }}
              />
            )}
          </Fragment>
        ))}
      </ul>

      {/* Health nudge */}
      {memberBriefing.healthNudge && (
        <div
          className="mt-6 p-3"
          style={{
            background: 'color-mix(in srgb, #2ECC8A 8%, transparent)',
            border: '1px solid color-mix(in srgb, #2ECC8A 20%, transparent)',
          }}
        >
          <p
            className={`italic text-[var(--on-surface-variant)] ${isGrandparent ? 'text-base' : 'text-sm'}`}
          >
            {memberBriefing.healthNudge}
          </p>
        </div>
      )}

      {/* Grandparent view: family moment card last */}
      {isGrandparent && memoryOfTheDay && (
        <div
          className="mt-5 p-4"
          style={{
            background: 'var(--surface-container)',
            border: '1px solid var(--outline-variant)',
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="size-3.5" style={{ color: 'var(--primary)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
              Today's family moment
            </span>
          </div>
          <blockquote
            className="text-base leading-relaxed italic text-[var(--on-surface)]"
            style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '12px' }}
          >
            &ldquo;{memoryOfTheDay.quote}&rdquo;
          </blockquote>
          <p className="mt-2 font-mono text-xs text-[var(--on-surface-variant)]">
            — {memoryOfTheDay.attribution}
          </p>
        </div>
      )}
    </section>
  )
}
