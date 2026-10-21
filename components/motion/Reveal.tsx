'use client'

import { motion, type Variants } from 'framer-motion'

type Tag = 'div' | 'span' | 'section' | 'ul' | 'ol' | 'li' | 'article' | 'header'

const TAGS = {
  div: motion.div,
  span: motion.span,
  section: motion.section,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  article: motion.article,
  header: motion.header,
}

const EASE = [0.22, 1, 0.36, 1] as const

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

interface Props {
  children?: React.ReactNode
  className?: string
  as?: Tag
  id?: string
  'aria-labelledby'?: string
  onPointerEnter?: () => void
  onPointerLeave?: () => void
}

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, className, as = 'div', delay = 0, ...rest }: Props & { delay?: number }) {
  const Comp = TAGS[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** A container whose StaggerItem children cascade in one after another. */
export function Stagger({ children, className, as = 'div', gap = 0.06, ...rest }: Props & { gap?: number }) {
  const Comp = TAGS[as]
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({ children, className, as = 'div', ...rest }: Props) {
  const Comp = TAGS[as]
  return (
    <Comp className={className} variants={item} {...rest}>
      {children}
    </Comp>
  )
}
