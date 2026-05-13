'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LoadDistribution } from '@/lib/data/mock-caregiver';

// ─── Constants ────────────────────────────────────────────────────────────────

const AMBER = '#e7c365';
const ERROR = '#ffb4ab';
const PRIMARY = '#cfbcff';
const SAFE_BG = 'rgba(207,188,255,0.12)';
const WARN_BG = 'rgba(231,195,101,0.14)';
const CRIT_BG = 'rgba(255,180,171,0.14)';

function barColor(score: number, threshold: number): string {
  if (score >= 80) return ERROR;
  if (score >= threshold) return AMBER;
  return PRIMARY;
}

function barBg(score: number, threshold: number): string {
  if (score >= 80) return CRIT_BG;
  if (score >= threshold) return WARN_BG;
  return SAFE_BG;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipArgs {
  active?: boolean;
  payload?: Array<{ value: number; payload: LoadDistribution }>;
}

function ChartTooltip({ active, payload }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  const { value, payload: row } = payload[0];
  const over = value >= 75;
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
        {row.member}
      </p>
      <p
        className="font-mono text-base font-bold"
        style={{ color: over ? (value >= 80 ? ERROR : AMBER) : PRIMARY }}
      >
        {value}
        <span className="ml-1 text-[10px] font-normal">/ 100</span>
      </p>
      {over && (
        <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: AMBER }}>
          above threshold
        </p>
      )}
    </div>
  );
}

// ─── Custom Y-axis tick ───────────────────────────────────────────────────────

function MemberTick(props: {
  x?: number; y?: number; payload?: { value: string };
  threshold: number;
  scores: Record<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) {
  const { x = 0, y = 0, payload, threshold, scores } = props;
  if (!payload) return null;
  const score = scores[payload.value] ?? 0;
  const color = barColor(score, threshold);
  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      dominantBaseline="central"
      style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 11,
        fill: color,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: score >= threshold ? 700 : 400,
      }}
    >
      {payload.value}
    </text>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function LoadDistributionChart({
  data,
  threshold,
}: {
  data: LoadDistribution[];
  threshold: number;
}) {
  const scoreMap = Object.fromEntries(data.map((d) => [d.member, d.score]));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex flex-col"
      style={{
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Load Distribution
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
            <span className="inline-block h-px w-6" style={{ background: PRIMARY }} />
            Safe
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: AMBER }}>
            <span className="inline-block h-px w-6 border-dashed border-t-2" style={{ borderColor: AMBER }} />
            Threshold ({threshold})
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: ERROR }}>
            <span className="inline-block h-px w-6" style={{ background: ERROR }} />
            Critical
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-6" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 40, bottom: 4, left: 56 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
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
            <YAxis
              type="category"
              dataKey="member"
              axisLine={false}
              tickLine={false}
              width={56}
              tick={
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (props: any) => (
                  <MemberTick {...props} threshold={threshold} scores={scoreMap} />
                )
              }
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />

            {/* Burnout threshold reference line */}
            <ReferenceLine
              x={threshold}
              stroke={AMBER}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              label={{
                value: `${threshold}`,
                position: 'top',
                fill: AMBER,
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
              }}
            />

            <Bar dataKey="score" radius={0} maxBarSize={20}>
              {data.map((entry) => (
                <Cell
                  key={entry.member}
                  fill={barColor(entry.score, threshold)}
                  style={{ opacity: entry.score >= threshold ? 1 : 0.75 }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
