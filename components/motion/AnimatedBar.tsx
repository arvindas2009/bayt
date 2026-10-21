'use client'

import { motion } from 'framer-motion'

interface Props {
  /** 0..1, clamped. */
  value: number
  color: string
  className?: string
  /** Optional marker (0..1), e.g. the burnout line. */
  tick?: number
  tickLabel?: string
  delay?: number
}

/** A horizontal bar that grows to a computed value when it comes into view. Decorative: pair it with the number in text. */
export default function AnimatedBar({ value, color, className = 'h-2', tick, tickLabel, delay = 0 }: Props) {
  const v = Math.min(Math.max(value, 0), 1)
  return (
    <div aria-hidden className={`relative w-full overflow-visible rounded-full bg-[var(--surface-high)] ${className}`}>
      <motion.div
        className="absolute inset-y-0 left-0 w-full rounded-full"
        style={{ background: color, transformOrigin: 'left' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: v }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 70, damping: 18, delay }}
      />
      {tick !== undefined && (
        <span
          title={tickLabel}
          className="absolute -inset-y-1.5 w-0 border-l-2 border-dashed border-[var(--ink)] opacity-70"
          style={{ left: `${Math.min(Math.max(tick, 0), 1) * 100}%` }}
        />
      )}
    </div>
  )
}
