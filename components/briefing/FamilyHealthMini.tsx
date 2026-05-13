import { useState } from 'react';
import type { FamilyMember } from '@/types';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  members: FamilyMember[];
}

// Derive a single status colour per member from their lab results and risk flags.
function memberColor(m: FamilyMember): string {
  const results = m.healthProfile?.lastLabResults ?? [];
  if (results.some((r) => r.status === 'alert')) return 'var(--error)';
  if (results.some((r) => r.status === 'monitor')) return 'var(--tertiary)';
  if ((m.healthProfile?.riskFlags?.length ?? 0) > 0) return 'var(--tertiary-container)';
  return 'var(--primary)';
}

// Abbreviated first name
const abbr = (name: string) => name.split(' ')[0].slice(0, 3).toUpperCase();

// Five fixed positions for the 5 Salem family members.
const POSITIONS = [
  { top: '50%', left: '50%' }, // center
  { top: '12%', left: '50%' }, // top
  { top: '88%', left: '50%' }, // bottom
  { top: '50%', left: '12%' }, // left
  { top: '50%', left: '88%' }, // right
];

export default function FamilyHealthMini({ members }: Props) {
  const slots = members.slice(0, 5);
  const shouldReduceMotion = useReducedMotion();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <section
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <header className="mb-6 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
        <span>Health Node Map</span>
        <div className="relative">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex size-5 items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            style={{ border: '1px solid var(--outline-variant)', borderRadius: '50%', fontSize: 10, color: 'var(--on-surface-variant)' }}
            aria-label="What is Health Node Map?"
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
                Each dot is a family member. Color shows their health status — green (normal), amber (monitor), red (alert). Pulsing lines show active health concerns. When you update a member's health data and regenerate, this map reflects those changes.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--on-surface-variant)] opacity-70" style={{ fontFamily: 'var(--font-inter)' }}>
                Visit the Health page for the full network view with shared pattern analysis.
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

      <div
        className="relative w-full border border-[var(--outline-variant)] overflow-hidden"
        style={{ height: 160, background: '#080c12' }}
      >
        {/* Connecting lines: horizontal and vertical through centre */}
        <div className="absolute" style={{ top: '50%', left: '12%', right: '12%', height: 1, background: 'var(--outline-variant)', transform: 'translateY(-50%)' }} />
        <div className="absolute" style={{ left: '50%', top: '12%', bottom: '12%', width: 1, background: 'var(--outline-variant)', transform: 'translateX(-50%)' }} />

        {/* Traveling pulses along active edges */}
        {!shouldReduceMotion && slots.map((member, i) => {
          if (i === 0) return null; // center node
          const color = memberColor(member);
          if (color === 'var(--primary)') return null; // only animate active/warning edge

          const pos = POSITIONS[i];
          // Define travel animation based on position index
          // 1: top (travels down to center)
          // 2: bottom (travels up to center)
          // 3: left (travels right to center)
          // 4: right (travels left to center)
          
          let initial = {};
          let animate = {};
          
          if (i === 1) { initial = { top: '12%', left: '50%' }; animate = { top: '50%' }; }
          if (i === 2) { initial = { top: '88%', left: '50%' }; animate = { top: '50%' }; }
          if (i === 3) { initial = { top: '50%', left: '12%' }; animate = { left: '50%' }; }
          if (i === 4) { initial = { top: '50%', left: '88%' }; animate = { left: '50%' }; }

          return (
            <motion.div
              key={`pulse-${member.id}`}
              className="absolute size-1.5 rounded-full"
              style={{ background: color, transform: 'translate(-50%, -50%)', ...initial }}
              animate={animate}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.5,
              }}
            />
          );
        })}

        {slots.map((member, i) => {
          const pos = POSITIONS[i];
          const color = memberColor(member);
          return (
            <div
              key={member.id}
              className="absolute flex flex-col items-center"
              style={{
                top: pos.top,
                left: pos.left,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="size-3" style={{ background: color }} />
              <span
                className="mt-1 font-mono text-[10px] uppercase text-[var(--on-surface)]"
                title={member.name}
              >
                {abbr(member.name)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          { color: 'var(--primary)', label: 'Normal' },
          { color: 'var(--tertiary)', label: 'Monitor' },
          { color: 'var(--error)', label: 'Alert' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="size-2 shrink-0" style={{ background: color }} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
