'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, ShieldCheck, Clock, Bell, ArrowRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AutoIntervention, BurnoutHistoryPoint } from '@/lib/data/mock-caregiver';

// ─── Constants ────────────────────────────────────────────────────────────────

const AMBER  = '#e7c365';
const ERROR  = '#ffb4ab';

const CATEGORY_ICON = {
  'time-block':   Clock,
  'task-shift':   ArrowRight,
  'notification': Bell,
} as const;

// ─── Burnout history dialog ───────────────────────────────────────────────────

interface TooltipArgs {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function HistoryTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2"
      style={{
        background: 'var(--surface-container-highest)',
        border: '1px solid var(--outline-variant)',
        fontFamily: 'var(--font-jetbrains-mono)',
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p
        className="font-mono text-base font-bold"
        style={{ color: payload[0].value >= 75 ? AMBER : 'var(--primary)' }}
      >
        {payload[0].value}
      </p>
    </div>
  );
}

function BurnoutHistoryDialog({
  history,
  threshold,
  onClose,
}: {
  history: BurnoutHistoryPoint[];
  threshold: number;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={onClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1,   y: 0  }}
          exit={{ opacity: 0, scale: 0.97,   y: 8  }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative flex w-full max-w-2xl flex-col gap-6 p-8"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderTop: `3px solid ${AMBER}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          {/* Header */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Burnout History — Last 4 Weeks
            </p>
            <p
              className="mt-1 text-xl font-bold text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Fatima — Load Trend
            </p>
          </div>

          {/* Warning callout */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: 'rgba(231,195,101,0.08)', border: `1px solid ${AMBER}` }}
          >
            <TrendingUp className="size-4 shrink-0" style={{ color: AMBER }} />
            <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: AMBER }}>
              Load has increased 43 points in 4 weeks — a consistent upward trend requiring action
            </p>
          </div>

          {/* Area chart */}
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={AMBER} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 10,
                    fill: 'var(--on-surface-variant)',
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 10,
                    fill: 'var(--on-surface-variant)',
                  }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<HistoryTooltip />} cursor={{ stroke: 'var(--outline-variant)' }} />
                <ReferenceLine
                  y={threshold}
                  stroke={AMBER}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  label={{
                    value: `Threshold ${threshold}`,
                    position: 'right',
                    fill: AMBER,
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 9,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="load"
                  stroke={AMBER}
                  strokeWidth={2}
                  fill="url(#loadGradient)"
                  dot={{ fill: AMBER, r: 4, strokeWidth: 0 }}
                  activeDot={{ fill: AMBER, r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={onClose}
            className="self-start font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Intervention chip ────────────────────────────────────────────────────────

function InterventionRow({ item, index }: { item: AutoIntervention; index: number }) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.07, duration: 0.28, ease: 'easeOut' }}
      className="flex items-start gap-3"
    >
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center"
        style={{ background: 'rgba(103,80,164,0.15)', border: '1px solid var(--primary-container)' }}
      >
        <Icon className="size-3.5" style={{ color: 'var(--primary)' }} />
      </div>
      <div>
        <p className="text-sm leading-relaxed text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-inter)' }}>
          {item.action}
        </p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
          Auto-applied · {item.protects}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function RiskSummaryCard({
  member,
  score,
  threshold,
  interventions,
  history,
}: {
  member: string;
  score: number;
  threshold: number;
  interventions: AutoIntervention[];
  history: BurnoutHistoryPoint[];
}) {
  const [showHistory, setShowHistory] = useState(false);
  const overThreshold = score >= threshold;
  const isCritical = score >= 80;
  const accentColor = isCritical ? ERROR : AMBER;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        className="flex flex-col"
        style={{
          border: `1px solid ${overThreshold ? accentColor : 'var(--outline-variant)'}`,
          background: 'var(--surface-container-lowest)',
        }}
      >
        {/* Alert banner */}
        {overThreshold && (
          <div
            className="flex items-center gap-3 px-6 py-2.5"
            style={{ background: isCritical ? 'rgba(255,180,171,0.08)' : 'rgba(231,195,101,0.08)', borderBottom: `1px solid ${accentColor}` }}
          >
            <span
              className="inline-block size-2 animate-pulse"
              style={{ background: accentColor }}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: accentColor }}>
              {isCritical ? 'Critical burnout risk — immediate attention required' : 'Above burnout threshold'}
            </span>
          </div>
        )}

        <div className="p-6 flex flex-col gap-6">
          {/* Score + name */}
          <div className="flex items-end gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                Caregiver load score
              </p>
              <div className="flex items-baseline gap-2 mt-1" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                <span
                  className="font-bold leading-none"
                  style={{ fontSize: 'clamp(56px, 8vw, 80px)', color: accentColor }}
                >
                  {score}
                </span>
                <span className="text-2xl font-semibold text-[var(--on-surface-variant)]">/ 100</span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                {member} · this week
              </p>
            </div>

            {/* Gauge bar */}
            <div className="flex-1 flex flex-col gap-2">
              <div
                className="relative h-3 w-full overflow-hidden"
                style={{ background: 'var(--surface-container-high)' }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  style={{ background: accentColor }}
                />
                {/* Threshold tick */}
                <div
                  className="absolute inset-y-0 w-px"
                  style={{ left: `${threshold}%`, background: AMBER, zIndex: 2 }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                <span>0</span>
                <span style={{ color: AMBER }}>threshold {threshold}</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Narrative text */}
          <div
            className="flex flex-col gap-2 pt-4"
            style={{ borderTop: '1px solid var(--outline-variant)' }}
          >
            <p
              className="text-sm leading-relaxed text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              <span style={{ color: accentColor, fontWeight: 600 }}>{member}</span> has managed{' '}
              <span style={{ color: accentColor, fontWeight: 600 }}>{score}% of household coordination</span>{' '}
              this week. She has had no personal time blocks in 6 days. Emotional labour and
              medical coordination are both at their highest recorded levels.
            </p>

            <button
              onClick={() => setShowHistory(true)}
              className="self-start mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{ color: AMBER }}
            >
              <TrendingUp className="size-3" />
              View burnout history (last 4 weeks)
            </button>
          </div>

          {/* Auto-applied interventions */}
          <div
            className="flex flex-col gap-4 pt-4"
            style={{ borderTop: '1px solid var(--outline-variant)' }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5" style={{ color: 'var(--primary)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                Bayt has auto-applied {interventions.length} protective actions
              </span>
            </div>
            {interventions.map((item, i) => (
              <InterventionRow key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      </motion.section>

      {showHistory && (
        <BurnoutHistoryDialog
          history={history}
          threshold={threshold}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
