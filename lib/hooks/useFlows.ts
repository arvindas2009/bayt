'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldFlow } from '@/components/visual/LoadField'
import { useMotionOK } from '@/lib/hooks/useMotionOK'

const FLOW_SECONDS = 2.4
const FLOW_END = 1.35

/**
 * Drives LoadField flow animations. `trigger(from, to)` sends a stream of light from one body to
 * another (a handoff was accepted); `flows` is the live list to pass to <LoadField />.
 * With reduced motion the stream is skipped: the bodies simply settle at their new sizes.
 */
export function useFlows() {
  const motionOK = useMotionOK()
  const [flows, setFlows] = useState<FieldFlow[]>([])
  const active = useRef<{ from: string; to: string; start: number }[]>([])
  const raf = useRef(0)

  const tick = useCallback(() => {
    const now = performance.now()
    active.current = active.current.filter((f) => (now - f.start) / 1000 / FLOW_SECONDS * FLOW_END < FLOW_END)
    setFlows(
      active.current.map((f) => ({ from: f.from, to: f.to, t: ((now - f.start) / 1000 / FLOW_SECONDS) * FLOW_END })),
    )
    raf.current = active.current.length ? requestAnimationFrame(tick) : 0
  }, [])

  const trigger = useCallback(
    (from: string, to: string) => {
      if (!motionOK) return
      active.current.push({ from, to, start: performance.now() })
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    },
    [motionOK, tick],
  )

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return { flows, trigger }
}
