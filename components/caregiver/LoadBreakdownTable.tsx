'use client';

import { motion } from 'framer-motion';
import type { LoadBreakdownRow } from '@/lib/data/mock-caregiver';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBERS = ['Salem', 'Fatima', 'Layla', 'Khalid', 'Aisha'] as const;
const AMBER = '#e7c365';
const ERROR = '#ffb4ab';
const PRIMARY = '#cfbcff';

function cellColor(value: number): string {
  if (value >= 80) return ERROR;
  if (value >= 60) return AMBER;
  if (value >= 30) return PRIMARY;
  return 'var(--on-surface-variant)';
}

function cellBg(value: number): string {
  if (value >= 80) return 'rgba(255,180,171,0.10)';
  if (value >= 60) return 'rgba(231,195,101,0.10)';
  if (value >= 30) return 'rgba(207,188,255,0.08)';
  return 'transparent';
}

// ─── Inline mini-bar ─────────────────────────────────────────────────────────

function MiniBar({ value }: { value: number }) {
  const color = cellColor(value);
  return (
    <div className="mt-1.5 h-px w-full" style={{ background: 'var(--surface-container-high)' }}>
      <div
        className="h-full"
        style={{ width: `${value}%`, background: color, opacity: 0.7 }}
      />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function LoadBreakdownTable({ rows }: { rows: LoadBreakdownRow[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
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
          Load Breakdown by Category
        </span>
        <div className="flex items-center gap-3">
          {[
            { color: PRIMARY, label: 'Low' },
            { color: AMBER,   label: 'High' },
            { color: ERROR,   label: 'Critical' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              <span className="inline-block size-2" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
              <th
                className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]"
                style={{ width: 140, minWidth: 120 }}
              >
                Category
              </th>
              {MEMBERS.map((m) => (
                <th
                  key={m}
                  className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest"
                  style={{
                    color: m === 'Fatima' ? AMBER : 'var(--on-surface-variant)',
                    fontWeight: m === 'Fatima' ? 700 : 400,
                    minWidth: 90,
                  }}
                >
                  {m}
                  {m === 'Fatima' && (
                    <span
                      className="ml-1.5 px-1 py-px font-mono text-[8px] uppercase tracking-widest"
                      style={{ background: 'rgba(231,195,101,0.15)', color: AMBER, border: `1px solid ${AMBER}` }}
                    >
                      At risk
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <motion.tr
                key={row.category}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 + rowIdx * 0.05, duration: 0.25 }}
                style={{ borderBottom: '1px solid var(--outline-variant)', opacity: rowIdx === rows.length - 1 ? 1 : undefined }}
              >
                <td
                  className="px-6 py-4 font-mono text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)]"
                >
                  {row.category}
                </td>
                {MEMBERS.map((m) => {
                  const value = row[m];
                  const color = cellColor(value);
                  const bg = cellBg(value);
                  return (
                    <td
                      key={m}
                      className="px-4 py-3 text-center"
                      style={{ background: bg }}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color, fontFamily: 'var(--font-jetbrains-mono)' }}
                        >
                          {value}
                        </span>
                        <MiniBar value={value} />
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div
        className="px-6 py-3"
        style={{ borderTop: '1px solid var(--outline-variant)' }}
      >
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          Values represent % share of household coordination handled by each member in each category this week
        </p>
      </div>
    </motion.section>
  );
}
