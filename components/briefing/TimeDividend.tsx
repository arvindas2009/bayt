'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hoursThisWeek: number;
  dailyBreakdown: { day: string; hours: number }[];
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipArgs {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
      style={{
        background: 'var(--surface-container-highest)',
        color: 'var(--on-surface)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      {label} — {payload[0].value.toFixed(1)}h
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimeDividend({ hoursThisWeek, dailyBreakdown }: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(1));
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controls = animate(count, hoursThisWeek, {
      duration: 1.5,
      ease: 'easeOut'
    });
    return controls.stop;
  }, [count, hoursThisWeek]);

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* ── Header label ── */}
      <header className="mb-4 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        <span>Time Dividend</span>
        <div className="relative" ref={infoRef}>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex size-5 items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            style={{ border: '1px solid var(--outline-variant)', borderRadius: '50%', fontSize: 10, color: 'var(--on-surface-variant)' }}
            aria-label="What is Time Dividend?"
          >
            ?
          </button>
          {showInfo && (
            <div
              className="absolute right-0 top-7 z-20 w-64 p-4 text-left"
              style={{
                background: 'var(--surface-container-highest)',
                border: '1px solid var(--outline-variant)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] mb-2">What is this?</p>
              <p className="text-xs leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
                Time Dividend shows hours returned to your family this week by Bayt's agents — time saved from manual scheduling, conflict resolution, meal planning, and coordination that would otherwise require back-and-forth messages and calls.
              </p>
              <button
                onClick={() => setShowInfo(false)}
                className="mt-3 font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60 hover:opacity-100"
              >
                Dismiss ×
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Big number ── */}
      <div className="mb-6 select-none">
        <div
          className="flex items-baseline gap-2 leading-none"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          <motion.span
            className="font-bold tracking-tight text-[var(--primary)]"
            style={{ fontSize: 'clamp(72px, 10vw, 112px)' }}
          >
            {rounded}
          </motion.span>
          <span
            className="font-semibold tracking-tight text-[var(--on-surface-variant)]"
            style={{ fontSize: 'clamp(28px, 3.5vw, 40px)' }}
          >
            hrs
          </span>
        </div>
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          Returned this week
        </span>
      </div>

      {/* ── Bar chart ── */}
      <div style={{ height: 88 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dailyBreakdown}
            barCategoryGap="28%"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                fill: 'var(--on-surface-variant)',
              }}
              height={18}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="hours" fill="var(--primary-container)" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
