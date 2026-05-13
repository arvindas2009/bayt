'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import type { DriftAlert, DriftSeverity } from '@/lib/data/mock-connection';

// ─── Token maps ───────────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<DriftSeverity, string> = {
  critical: 'var(--error)',
  warning:  'var(--tertiary)',
  info:     'var(--outline)',
};

const SEVERITY_LABEL: Record<DriftSeverity, string> = {
  critical: 'Critical drift',
  warning:  'Moderate drift',
  info:     'Minor drift',
};

const SEVERITY_TEXT: Record<DriftSeverity, string> = {
  critical: 'var(--error)',
  warning:  'var(--tertiary)',
  info:     'var(--on-surface-variant)',
};

function SeverityIcon({ s }: { s: DriftSeverity }) {
  const props = { className: 'size-3.5', style: { color: SEVERITY_TEXT[s] } };
  if (s === 'critical') return <AlertTriangle {...props} />;
  if (s === 'warning')  return <AlertCircle  {...props} />;
  return <Info {...props} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const MEMBER_COLOR: Record<string, string> = {
  Salem:  'var(--primary-container)',
  Fatima: '#4d4465',
  Layla:  'var(--tertiary-container, #c9a74d)',
  Khalid: '#2d4a3e',
  Aisha:  '#3d3060',
};

function Avatar({ name }: { name: string }) {
  const bg = MEMBER_COLOR[name] ?? 'var(--surface-container-high)';
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center font-mono text-[11px] font-bold uppercase tracking-widest"
      style={{ background: bg, color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }}
    >
      {name.slice(0, 2)}
    </div>
  );
}

// ─── Dashed connector ─────────────────────────────────────────────────────────

function DriftConnector({ days, severity }: { days: number; severity: DriftSeverity }) {
  const color = SEVERITY_BORDER[severity];
  return (
    <div className="relative flex flex-1 items-center px-2">
      <svg width="100%" height="24" className="overflow-visible" aria-hidden>
        <line
          x1="0" y1="12" x2="100%" y2="12"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.7"
        />
      </svg>
      <span
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest whitespace-nowrap"
        style={{
          background: 'var(--surface-container-lowest)',
          color,
          border: `1px solid ${color}`,
          opacity: 0.9,
        }}
      >
        {days}d
      </span>
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────

function DriftCard({ alert, index, onGenerateRepair }: { alert: DriftAlert; index: number; onGenerateRepair?: (alert: DriftAlert) => Promise<void> }) {
  const [done, setDone] = useState(false);
  const borderColor = SEVERITY_BORDER[alert.severity];

  const handleGenerateRepair = async () => {
    if (onGenerateRepair) {
      await onGenerateRepair(alert);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-4 p-5"
      style={{
        background: 'var(--surface-container-lowest)',
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
        borderRight: '1px solid var(--outline-variant)',
        borderLeft: `3px solid ${borderColor}`,
        opacity: done ? 0.45 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* Severity label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SeverityIcon s={alert.severity} />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: SEVERITY_TEXT[alert.severity] }}
          >
            {SEVERITY_LABEL[alert.severity]}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          {alert.driftLabel}
        </span>
      </div>

      {/* Member pair graphic */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <Avatar name={alert.memberA} />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            {alert.memberA}
          </span>
        </div>
        <DriftConnector days={alert.driftDays} severity={alert.severity} />
        <div className="flex flex-col items-center gap-1">
          <Avatar name={alert.memberB} />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            {alert.memberB}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
        {alert.description}
      </p>

      {/* Suggestion + mark done */}
      <div
        className="flex flex-col gap-3 pt-3"
        style={{ borderTop: '1px dashed var(--outline-variant)' }}
      >
        <p
          className="text-sm leading-relaxed text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          {alert.suggestion}
        </p>
        <button
          onClick={() => setDone((d) => !d)}
          className="flex items-center gap-2 self-start font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ color: done ? 'var(--primary)' : 'var(--on-surface-variant)' }}
          aria-pressed={done}
        >
          {done
            ? <CheckSquare className="size-3.5" style={{ color: 'var(--primary)' }} />
            : <Square      className="size-3.5" />
          }
          {done ? 'Done' : 'Mark done'}
        </button>
        {onGenerateRepair && (
          <button
            onClick={handleGenerateRepair}
            className="flex items-center gap-2 self-start font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80 mt-1"
            style={{ color: 'var(--primary)' }}
          >
            Bayt suggests a repair →
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function RelationshipDriftAlerts({ 
  alerts,
  onGenerateRepair
}: { 
  alerts: DriftAlert[],
  onGenerateRepair?: (alert: DriftAlert) => Promise<void>
}) {
  return (
    <section className="flex flex-col gap-0">
      <header
        className="mb-4 flex items-center justify-between px-1"
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Relationship Drift
        </span>
        <div className="flex items-center gap-1.5">
          <div className="size-1.5" style={{ background: 'var(--error)' }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            {alerts.filter((a) => a.severity === 'critical').length} critical
          </span>
        </div>
      </header>
      <div className="flex flex-col gap-3">
        {alerts.map((alert, i) => (
          <DriftCard key={alert.id} alert={alert} index={i} onGenerateRepair={onGenerateRepair} />
        ))}
      </div>
    </section>
  );
}
