'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { HealthTwin } from '@/types/agents'

interface Props {
  twin: HealthTwin
  memberName: string
  ancestorName?: string
}

function buildChartData(twin: HealthTwin) {
  const currentMap = Object.fromEntries(twin.currentTrajectory.map((p) => [p.year, p]))
  const projectedMap = Object.fromEntries(twin.projectedTrajectory.map((p) => [p.year, p]))
  const allYears = Array.from(
    new Set([
      ...twin.currentTrajectory.map((p) => p.year),
      ...twin.projectedTrajectory.map((p) => p.year),
    ]),
  ).sort((a, b) => a - b)

  return allYears.map((year) => ({
    year,
    current: currentMap[year]?.riskScore,
    projected: projectedMap[year]?.riskScore,
    currentRisk: currentMap[year]?.dominantRisk,
    projectedRisk: projectedMap[year]?.dominantRisk,
  }))
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string; payload: Record<string, string | number> }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--surface-container-highest)',
        border: '1px solid var(--outline-variant)',
        padding: '8px 12px',
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 11,
      }}
    >
      <div
        className="mb-1.5 font-bold"
        style={{ color: 'var(--on-surface-variant)', fontSize: 10, letterSpacing: '0.08em' }}
      >
        {label}
      </div>
      {payload.map((entry) => {
        const riskKey = entry.dataKey === 'current' ? 'currentRisk' : 'projectedRisk'
        const dominantRisk = entry.payload[riskKey] as string | undefined
        return (
          <div key={entry.dataKey} className="flex flex-col gap-0.5">
            <span style={{ color: entry.color }}>
              {entry.dataKey === 'current' ? 'Current' : 'Projected'}: {entry.value}
            </span>
            {dominantRisk && (
              <span style={{ color: 'var(--on-surface-variant)', fontSize: 10 }}>
                {dominantRisk}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function HealthTwinChart({ twin, memberName, ancestorName }: Props) {
  const data = buildChartData(twin)

  return (
    <div className="flex flex-col gap-6" aria-label={`Health twin projection for ${memberName}`}>
      {/* Ancestor attribution banner */}
      {ancestorName && twin.relatedAncestorPattern && (
        <div
          className="flex items-start gap-3 px-4 py-3"
          style={{
            background: 'rgba(103, 80, 164, 0.12)',
            border: '1px solid rgba(207, 188, 255, 0.2)',
          }}
        >
          <div
            className="mt-0.5 size-1.5 shrink-0 rounded-full"
            style={{ background: '#cfbcff' }}
          />
          <div>
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: '#cfbcff' }}
            >
              Trajectory anchored to {ancestorName}&apos;s health history
            </span>
            <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
              {twin.relatedAncestorPattern}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 4, left: -8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--outline-variant)"
            strokeOpacity={0.35}
          />
          <XAxis
            dataKey="year"
            tick={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10,
              fill: 'var(--on-surface-variant)',
            }}
            axisLine={{ stroke: 'var(--outline-variant)' }}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[0, 100]}
            tick={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10,
              fill: 'var(--on-surface-variant)',
            }}
            axisLine={{ stroke: 'var(--outline-variant)' }}
            tickLine={false}
            label={{
              value: 'Risk',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--on-surface-variant)',
              fontSize: 9,
              dx: 12,
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            y={75}
            stroke="#e7c365"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{
              value: 'Alert threshold',
              fill: '#e7c365',
              fontSize: 9,
              position: 'insideTopRight',
              fontFamily: 'var(--font-jetbrains-mono)',
            }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontSize: 10,
              color: 'var(--on-surface-variant)',
              paddingTop: 8,
            }}
            formatter={(value: string) =>
              value === 'current' ? 'Current trajectory' : 'Projected with interventions'
            }
          />
          <Line
            type="monotone"
            dataKey="current"
            name="current"
            stroke="#3D7FFF"
            strokeWidth={2}
            dot={{ fill: '#3D7FFF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#3D7FFF' }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="projected"
            stroke="#2ECC8A"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: '#2ECC8A', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#2ECC8A' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Genetic risk factors */}
        {twin.geneticRiskFactors.length > 0 && (
          <div>
            <div
              className="mb-2.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Genetic Risk Factors
            </div>
            <div className="flex flex-wrap gap-2">
              {twin.geneticRiskFactors.map((factor, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 font-mono text-[10px]"
                  style={{
                    background: 'rgba(255, 180, 171, 0.12)',
                    color: '#ffb4ab',
                    border: '1px solid rgba(255, 180, 171, 0.25)',
                  }}
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interventions applied */}
        {twin.interventionsApplied.length > 0 && (
          <div>
            <div
              className="mb-2.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Interventions Applied
            </div>
            <ul className="flex flex-col gap-2">
              {twin.interventionsApplied.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div
                    className="mt-1.5 size-1.5 shrink-0"
                    style={{ background: '#2ECC8A' }}
                  />
                  <span
                    className="font-mono text-[10px] leading-relaxed"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
