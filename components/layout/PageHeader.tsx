'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Reveal } from '@/components/motion/Reveal'

interface Props {
  title: React.ReactNode
  /** Plain-text title for the compact bar. */
  shortTitle: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}

/**
 * A page's title and its main buttons. Once the title scrolls away, a slim bar slides in under the
 * top bar with the same buttons, so the page's actions are always one click away.
 */
export default function PageHeader({ title, shortTitle, subtitle, actions }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // The top bar covers the first 56px, so the header counts as gone once it slides under it.
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Reveal as="header" className="mb-2 flex flex-wrap items-end justify-between gap-6">
        <div ref={ref}>
          <h1 className="font-display text-5xl !leading-[1.1] text-[var(--ink)] md:text-6xl">{title}</h1>
          {subtitle && <div className="mt-3">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </Reveal>

      <AnimatePresence>
        {stuck && actions && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-20 right-0 top-14 z-20 flex h-12 items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--bg)]/80 px-10 backdrop-blur-xl"
          >
            <span className="font-display truncate text-xl text-[var(--ink)]" aria-hidden>
              {shortTitle}
            </span>
            <div className="flex items-center gap-2 [&_button]:!py-1.5 [&_a]:!py-1.5">{actions}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
