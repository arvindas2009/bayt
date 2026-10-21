'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'
import { useMotionOK } from '@/lib/hooks/useMotionOK'

function decimalsOf(n: number): number {
  const s = String(n)
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}

/**
 * Counts up to a computed number the first time it is seen. It only animates the way the number
 * arrives: the final text is exactly `value`, and screen readers get that text directly.
 */
export default function CountUp({ value, className = '', duration = 1.1 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const motionOK = useMotionOK()
  const decimals = decimalsOf(value)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView || !motionOK) return
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => setShown(value),
    })
    return () => controls.stop()
  }, [inView, motionOK, value, duration])

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>{motionOK ? shown.toFixed(decimals) : value}</span>
    </span>
  )
}
