'use client'

// 30-day mock time-series chart for a single member.
// Uses a seeded deterministic LCG (Park–Miller) so the same member always
// produces the same waveform across renders and reloads.

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { FamilyMember } from '@/types'

// ─── Seeded random ────────────────────────────────────────────────────────────

function seedFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function lcg(seed: number, n: number): number[] {
  // Park–Miller LCG in [0, 1)
  const M = 2_147_483_647
  const A = 16_807
  const out: number[] = []
  let s = (seed % (M - 1)) + 1
  for (let i = 0; i < n; i++) {
    s = (s * A) % M
    out.push((s - 1) / (M - 1))
  }
  return out
}

// ─── Metric definitions ───────────────────────────────────────────────────────

export type MetricType = 'bp' | 'heartRate' | 'glucose' | 'sleep' | 'steps'

interface MetricDef {
  label:      string
  unit:       string
  yMin:       number
  yMax:       number
  refLines:   { value: number; label: string; color: string; dashed?: boolean }[]
  isMultiLine: boolean
  // Returns one or two data values for the data point
  values: (r: number, r2: number, i: number) => { primary: number; secondary?: number }
  primaryName:   string
  secondaryName?: string
  primaryColor:  string
  secondaryColor?: string
}

const METRICS: Record<MetricType, MetricDef> = {
  bp: {
    label:     'Blood Pressure',
    unit:      'mmHg',
    yMin:      60,
    yMax:      180,
    refLines:  [
      { value: 120, label: '120', color: '#2ECC8A',  dashed: true },
      { value: 140, label: '140', color: '#ffb4ab',  dashed: false },
    ],
    isMultiLine:   true,
    primaryName:   'Systolic',
    secondaryName: 'Diastolic',
    primaryColor:  '#ffb4ab',
    secondaryColor: '#cfbcff',
    values: (r, r2, i) => ({
      primary:   Math.round(132 + (r - 0.5) * 28 + Math.sin(i / 8) * 7),
      secondary: Math.round(82  + (r2 - 0.5) * 16 + Math.sin(i / 8) * 4),
    }),
  },
  heartRate: {
    label:     'Heart Rate',
    unit:      'bpm',
    yMin:      50,
    yMax:      110,
    refLines:  [
      { value: 60,  label: '60',  color: '#2ECC8A', dashed: true },
      { value: 100, label: '100', color: '#ffb4ab', dashed: true },
    ],
    isMultiLine:  false,
    primaryName:  'Heart Rate',
    primaryColor: '#e87040',
    values: (r, _, i) => ({ primary: Math.round(70 + (r - 0.5) * 24 + Math.sin(i / 6) * 6) }),
  },
  glucose: {
    label:     'Blood Glucose',
    unit:      'mg/dL',
    yMin:      50,
    yMax:      230,
    refLines:  [
      { value: 70,  label: '70',  color: '#cfbcff', dashed: true },
      { value: 140, label: '140', color: '#ffb4ab', dashed: false },
    ],
    isMultiLine:  false,
    primaryName:  'Glucose',
    primaryColor: '#e7c365',
    values: (r, _, i) => ({ primary: Math.round(115 + (r - 0.5) * 70 + Math.sin(i / 5) * 22) }),
  },
  sleep: {
    label:     'Sleep Duration',
    unit:      'hrs',
    yMin:      3,
    yMax:      10,
    refLines:  [
      { value: 7, label: '7h', color: '#2ECC8A', dashed: true },
      { value: 9, label: '9h', color: '#cfbcff', dashed: true },
    ],
    isMultiLine:  false,
    primaryName:  'Sleep',
    primaryColor: '#2ECC8A',
    values: (r, _, i) => ({
      primary: Math.round((6.2 + (r - 0.5) * 3.2 + Math.sin(i / 7) * 0.9) * 10) / 10,
    }),
  },
  steps: {
    label:     'Daily Steps',
    unit:      'steps',
    yMin:      0,
    yMax:      20_000,
    refLines:  [
      { value: 10_000, label: '10k', color: '#2ECC8A', dashed: true },
    ],
    isMultiLine:  false,
    primaryName:  'Steps',
    primaryColor: '#3D7FFF',
    values: (r, _, i) => ({
      primary: Math.round(7_500 + (r - 0.5) * 9_000 + Math.sin(i / 10) * 2_200),
    }),
  },
}

// ─── Data generation ──────────────────────────────────────────────────────────

interface DataPoint {
  date:      string
  primary:   number
  secondary?: number
}

function generate30Days(memberId: string, metric: MetricType): DataPoint[] {
  const seed1 = seedFromString(memberId + metric + 'primary')
  const seed2 = seedFromString(memberId + metric + 'secondary')
  const rands1 = lcg(seed1, 30)
  const rands2 = lcg(seed2, 30)

  const today = new Date()
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const vals = METRICS[metric].values(rands1[i], rands2[i], i)
    return { date: label, ...vals }
  })
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label, metric,
}: {
  active?: boolean; payload?: any[]; label?: string; metric: MetricType
}) {
  if (!active || !payload?.length) return null
  const def = METRICS[metric]
  return (
    <div
      style={{
        background: 'var(--surface-container-highest)',
        border:     '1px solid var(--outline-variant)',
        padding:    '8px 12px',
        fontFamily: 'var(--font-jetbrains-mono)',
      }}
    >
      <div className="mb-1.5 text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="text-xs tabular-nums" style={{ color: p.stroke ?? p.color }}>
          {p.name}:{' '}
          <span className="font-bold">
            {p.value} {def.unit}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Metric tab button ────────────────────────────────────────────────────────

const METRIC_TABS: MetricType[] = ['bp', 'heartRate', 'glucose', 'sleep', 'steps']

function MetricTab({
  metric, active, onClick,
}: { metric: MetricType; active: boolean; onClick: () => void }) {
  const def = METRICS[metric]
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors"
      style={{
        background:  active ? def.primaryColor + '22' : 'transparent',
        color:       active ? def.primaryColor : 'var(--on-surface-variant)',
        border:      `1px solid ${active ? def.primaryColor + '60' : 'var(--outline-variant)'}`,
      }}
    >
      {def.label}
    </button>
  )
}

// ─── HealthTimeline ───────────────────────────────────────────────────────────

interface Props {
  member:      FamilyMember
  accentColor: string
}

const TICK_STYLE = {
  fontSize:   10,
  fontFamily: 'var(--font-jetbrains-mono)',
  fill:       'var(--on-surface-variant)',
}

export default function HealthTimeline({ member, accentColor }: Props) {
  const [metric, setMetric] = useState<MetricType>('heartRate')

  const data = useMemo(
    () => generate30Days(member.id, metric),
    [member.id, metric],
  )

  const def = METRICS[metric]

  // Show only every 5th date label on the x-axis to avoid crowding
  const tickFormatter = (val: string, idx: number) => (idx % 5 === 0 ? val : '')

  const yTickFormatter = (val: number) => {
    if (metric === 'steps') return val >= 1000 ? `${val / 1000}k` : String(val)
    return String(val)
  }

  return (
    <div
      className="flex flex-col"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      {/* Header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-container-lowest)] px-6 py-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            30-Day Trend
          </span>
          <div
            className="mt-0.5 text-sm font-bold text-[var(--on-surface)]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {def.label}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METRIC_TABS.map((m) => (
            <MetricTab
              key={m}
              metric={m}
              active={m === metric}
              onClick={() => setMetric(m)}
            />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[var(--surface-container-lowest)] px-2 pb-4">
        <ResponsiveContainer width="100%" height={200}>
          {def.isMultiLine ? (
            // Blood pressure: two plain lines, no area fill
            <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <pattern id="tl-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="0" cy="0" r="0.4" fill="var(--outline-variant)" fillOpacity="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tl-grid)" />
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--outline-variant)"
                strokeOpacity={0.2}
                horizontal vertical={false}
              />
              {def.refLines.map((r) => (
                <ReferenceLine
                  key={r.value}
                  y={r.value}
                  stroke={r.color}
                  strokeDasharray={r.dashed ? '4 3' : '0'}
                  strokeOpacity={0.6}
                  label={{ value: r.label, fill: r.color, fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)' }}
                />
              ))}
              <XAxis dataKey="date" tick={TICK_STYLE} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
              <YAxis domain={[def.yMin, def.yMax]} tick={TICK_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={yTickFormatter} />
              <Tooltip content={<ChartTooltip metric={metric} />} />
              <Line dataKey="primary"   stroke={def.primaryColor}   strokeWidth={2} dot={false} name={def.primaryName}   />
              <Line dataKey="secondary" stroke={def.secondaryColor!} strokeWidth={2} dot={false} name={def.secondaryName!} />
            </LineChart>
          ) : (
            // Single metric: area chart with gradient fill
            <AreaChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id={`tl-fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={def.primaryColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={def.primaryColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--outline-variant)"
                strokeOpacity={0.2}
                horizontal vertical={false}
              />
              {def.refLines.map((r) => (
                <ReferenceLine
                  key={r.value}
                  y={r.value}
                  stroke={r.color}
                  strokeDasharray={r.dashed ? '4 3' : '0'}
                  strokeOpacity={0.6}
                  label={{ value: r.label, fill: r.color, fontSize: 9, fontFamily: 'var(--font-jetbrains-mono)' }}
                />
              ))}
              <XAxis dataKey="date" tick={TICK_STYLE} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
              <YAxis domain={[def.yMin, def.yMax]} tick={TICK_STYLE} tickLine={false} axisLine={false} width={36} tickFormatter={yTickFormatter} />
              <Tooltip content={<ChartTooltip metric={metric} />} />
              <Area
                dataKey="primary"
                stroke={def.primaryColor}
                strokeWidth={2}
                fill={`url(#tl-fill-${metric})`}
                dot={false}
                name={def.primaryName}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend for multi-line */}
      {def.isMultiLine && (
        <div className="flex gap-4 bg-[var(--surface-container-lowest)] px-6 pb-4">
          {[
            { color: def.primaryColor,   name: def.primaryName },
            { color: def.secondaryColor!, name: def.secondaryName! },
          ].map(({ color, name }) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className="h-px w-5" style={{ background: color }} />
              <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--on-surface-variant)]">
                {name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
