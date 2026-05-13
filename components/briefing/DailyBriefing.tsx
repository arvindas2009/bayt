'use client';

import { Fragment, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useBriefingStore } from '@/store/briefing-store';
import type { BriefingData, BriefingInsight, InsightSeverity, AgentName } from '@/types';

// ─── Token maps ───────────────────────────────────────────────────────────────

// Dot color keyed by agent (task spec: blue=ops, green=health, purple=conn, amber=care)
const AGENT_DOT: Record<AgentName, string> = {
  operations: '#3D7FFF',           // blue
  health:     '#2ECC8A',           // green
  connection: 'var(--primary)',    // purple (MD3 primary = #cfbcff)
  caregiver:  'var(--tertiary)',   // amber/gold
};

const AGENT_LABEL: Record<AgentName, string> = {
  operations: 'OPS',
  health:     'HEALTH',
  connection: 'CONN',
  caregiver:  'CARE',
};

// Severity sort weight — lower = higher priority
const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning:  1,
  info:     2,
};

// Badge only renders for critical
const CRITICAL_BADGE = (
  <span
    className="shrink-0 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 leading-none"
    style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
  >
    Critical
  </span>
);

// ─── Row ──────────────────────────────────────────────────────────────────────

function InsightRow({
  insight,
  index,
}: {
  insight: BriefingInsight;
  index: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      className="flex items-start gap-4"
    >
      {/* Agent-coloured dot */}
      <div
        className="mt-[7px] size-2 shrink-0"
        style={{ background: AGENT_DOT[insight.agent] }}
      />

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base leading-relaxed text-[var(--on-surface)]">{insight.text}</p>
          {insight.severity === 'critical' && CRITICAL_BADGE}
        </div>

        {/* Agent label */}
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: AGENT_DOT[insight.agent], opacity: 0.75 }}
        >
          {AGENT_LABEL[insight.agent]}
        </span>
      </div>
    </motion.li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
}

export default function DailyBriefing({ briefing }: Props) {
  const refreshBriefing = useBriefingStore((s) => s.refreshBriefing);

  const sorted = useMemo(
    () =>
      [...briefing.insights].sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      ),
    [briefing.insights]
  );

  const genTime = format(new Date(briefing.date), 'h:mm aa');

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop:    '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Today's Briefing
        </span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            Generated {genTime}
          </span>
          <button
            onClick={() => refreshBriefing()}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-[var(--on-surface)]"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Refresh briefing"
          >
            <RefreshCw className="size-3" />
            Refresh
          </button>
        </div>
      </header>

      {/* Summary */}
      {briefing.summary && (
        <p
          className="mb-6 pb-5 text-sm italic leading-relaxed text-[var(--on-surface-variant)]"
          style={{ borderBottom: '1px solid var(--outline-variant)' }}
        >
          {briefing.summary}
        </p>
      )}

      {/* Insight list */}
      <ul className="space-y-0">
        {sorted.map((insight, i) => (
          <Fragment key={insight.id}>
            <InsightRow insight={insight} index={i} />
            {i < sorted.length - 1 && (
              <div
                className="my-4 h-px w-full"
                style={{ background: 'var(--outline-variant)', opacity: 0.3 }}
              />
            )}
          </Fragment>
        ))}
      </ul>
    </section>
  );
}
