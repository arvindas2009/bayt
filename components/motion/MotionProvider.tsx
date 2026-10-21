'use client'

import { MotionConfig } from 'framer-motion'

/** Every framer animation in the app honours the OS reduced-motion setting (transforms are skipped). */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
