'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/**
 * True when it is fine to animate. False when the user asked for reduced motion.
 * Server render and first paint assume motion is fine; the client corrects it before any
 * animation frame is requested.
 */
export function useMotionOK(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(QUERY).matches,
    () => true,
  )
}
