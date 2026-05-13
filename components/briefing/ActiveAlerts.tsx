'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { BriefingAlert, AgentName, InsightSeverity } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  alerts: BriefingAlert[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  critical: 'var(--error)',
  warning:  'var(--tertiary)',
  info:     'var(--outline-variant)',
};

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  critical: 'Critical',
  warning:  'Warning',
  info:     'Info',
};

const AGENT_ROUTE: Record<AgentName, string> = {
  operations: '/operations',
  health:     '/health',
  connection: '/connection',
  caregiver:  '/caregiver',
};

const MAX_VISIBLE = 5;

// ─── Row ──────────────────────────────────────────────────────────────────────

function AlertRow({ alert, index }: { alert: BriefingAlert; index: number }) {
  const color = SEVERITY_COLOR[alert.severity];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      className="flex items-start gap-3"
    >
      {/* Severity dot */}
      <div
        className="mt-[7px] size-2 shrink-0"
        style={{ background: color }}
        aria-label={SEVERITY_LABEL[alert.severity]}
      />

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug text-[var(--on-surface)] flex-1">{alert.text}</p>
          <Link
            href={AGENT_ROUTE[alert.agent]}
            className="shrink-0 font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-[var(--on-surface)]"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            View →
          </Link>
        </div>
        {/* Member + severity badge */}
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color }}
          >
            {SEVERITY_LABEL[alert.severity]}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}
          >
            · {alert.memberName}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveAlerts({ alerts }: Props) {
  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.length - MAX_VISIBLE;

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Header */}
      <header className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        <span>Active Alerts</span>
        <AlertTriangle className="size-4 opacity-60" />
      </header>

      {sorted.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          No active alerts
        </p>
      ) : (
        <>
          <ul className="space-y-0">
            {visible.map((alert, i) => (
              <Fragment key={alert.id}>
                <AlertRow alert={alert} index={i} />
                {i < visible.length - 1 && (
                  <div
                    className="my-4 h-px w-full"
                    style={{ background: 'var(--outline-variant)', opacity: 0.3 }}
                  />
                )}
              </Fragment>
            ))}
          </ul>

          {overflow > 0 && (
            <div className="mt-5" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
              <Link
                href="/health"
                className="font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-[var(--on-surface)]"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                View all ({sorted.length}) →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
