'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { MoodScore } from '@/types/agents';

interface Props {
  score: MoodScore;
}

const TREND = {
  rising:  { Icon: TrendingUp,  color: '#2ECC8A' },
  stable:  { Icon: Minus,        color: 'var(--on-surface-variant)' },
  falling: { Icon: TrendingDown, color: 'var(--error)' },
} as const;

const COMPONENTS: { key: keyof MoodScore['components']; label: string }[] = [
  { key: 'health',      label: 'Health'    },
  { key: 'relational',  label: 'Relational' },
  { key: 'operational', label: 'Ops'       },
  { key: 'caregiver',   label: 'Caregiver' },
];

export default function AmbientMoodScore({ score }: Props) {
  const { Icon, color } = TREND[score.trend];

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <header className="mb-4 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        Family Pulse
      </header>

      {/* Composite number + trend */}
      <div className="flex items-center gap-3 leading-none mb-4">
        <span
          className="font-bold tracking-tight text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 'clamp(64px, 9vw, 96px)' }}
        >
          {score.composite}
        </span>
        <Icon size={28} style={{ color }} strokeWidth={2} />
      </div>

      {/* 30-day sparkline */}
      <div className="mb-5" style={{ height: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={score.historicalScores}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          >
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Component bars */}
      <div className="flex flex-col gap-2.5">
        {COMPONENTS.map(({ key, label }) => {
          const value = score.components[key];
          return (
            <div key={key} className="flex items-center gap-2.5">
              <span
                className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]"
                style={{ width: 58 }}
              >
                {label}
              </span>
              <div
                className="relative flex-1 overflow-hidden"
                style={{ height: 3, background: 'var(--surface-container-high)' }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${value}%`, background: 'var(--primary-container)' }}
                />
              </div>
              <span
                className="shrink-0 text-right font-mono text-[10px] text-[var(--on-surface-variant)]"
                style={{ width: 24 }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
