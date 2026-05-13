'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Zap } from 'lucide-react';
import type { MicroIntervention } from '@/lib/data/mock-connection';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: MicroIntervention['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EFFORT_COLOR = {
  low:    'var(--primary)',
  medium: 'var(--tertiary)',
  high:   'var(--error)',
} as const;

const EFFORT_LABEL = {
  low:    'Quick',
  medium: 'Medium',
  high:   'Invest',
} as const;

// Today is Thursday (index 3 in the week) relative to mock data
const TODAY_IDX = 3;

// ─── Item ─────────────────────────────────────────────────────────────────────

function InterventionItem({
  item,
  index,
  isLast,
}: {
  item: MicroIntervention;
  index: number;
  isLast: boolean;
}) {
  const [done, setDone] = useState(false);
  const dotColor = EFFORT_COLOR[item.effort];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3, ease: 'easeOut' }}
      className="relative flex gap-4"
      style={{ opacity: done ? 0.4 : 1, transition: 'opacity 0.3s' }}
    >
      {/* Vertical track */}
      <div className="flex flex-col items-center">
        <div
          className="size-2.5 shrink-0 mt-0.5"
          style={{ background: dotColor, border: `1.5px solid ${dotColor}` }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{ background: 'var(--outline-variant)', minHeight: 28 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 pb-5">
        {/* Day badge */}
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] uppercase tracking-widest px-1.5 py-px"
            style={{
              background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            {item.day}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: dotColor }}
          >
            {EFFORT_LABEL[item.effort]}
          </span>
        </div>

        {/* Action text */}
        <p
          className="text-sm leading-relaxed text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          {item.action}
        </p>

        {/* Relationship tag + mark done */}
        <div className="flex items-center justify-between gap-3 mt-1">
          <span
            className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-70"
          >
            {item.relationship}
          </span>
          <button
            onClick={() => setDone((d) => !d)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{ color: done ? 'var(--primary)' : 'var(--on-surface-variant)' }}
            aria-pressed={done}
          >
            {done
              ? <CheckSquare className="size-3" style={{ color: 'var(--primary)' }} />
              : <Square      className="size-3" />
            }
            {done ? 'Done' : 'Mark done'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function MicroInterventionsTimeline({
  interventions,
}: {
  interventions: MicroIntervention[];
}) {
  const sorted = [...interventions].sort(
    (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
  );

  return (
    <section className="flex flex-col gap-0">
      <header className="mb-4 flex items-center justify-between px-1">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          This Week
        </span>
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5 opacity-60" style={{ color: 'var(--primary)' }} />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--primary)' }}
          >
            {interventions.length} micro-actions
          </span>
        </div>
      </header>

      {/* Day ruler */}
      <div
        className="mb-5 flex items-center gap-0 overflow-hidden"
        style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
      >
        {DAYS.map((day, i) => {
          const hasItem = sorted.some((x) => x.day === day);
          const isToday = i === TODAY_IDX;
          return (
            <div
              key={day}
              className="flex-1 py-1.5 text-center font-mono text-[9px] uppercase tracking-widest"
              style={{
                color: isToday
                  ? 'var(--primary)'
                  : hasItem
                  ? 'var(--on-surface)'
                  : 'var(--on-surface-variant)',
                background: isToday ? 'var(--surface-container)' : 'transparent',
                borderRight: i < DAYS.length - 1 ? '1px solid var(--outline-variant)' : 'none',
                fontWeight: isToday ? 700 : 400,
                opacity: hasItem || isToday ? 1 : 0.35,
              }}
            >
              {day}
              {hasItem && (
                <div
                  className="mx-auto mt-1 size-1"
                  style={{ background: isToday ? 'var(--primary)' : 'var(--outline)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex flex-col">
        {sorted.map((item, i) => (
          <InterventionItem
            key={item.id}
            item={item}
            index={i}
            isLast={i === sorted.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
