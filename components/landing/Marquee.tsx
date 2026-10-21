import { ArrowRight } from 'lucide-react'

const TONES = {
  sand: 'bg-[var(--sand)] text-[var(--on-sand)]',
  zest: 'bg-[var(--zest)] text-[var(--on-zest)]',
} as const

/**
 * A scrolling tape of short phrases (landing page only). Decorative: hidden from screen readers,
 * because every phrase is said again in the sections below. The items are rendered twice so the
 * -50% animation loops without a seam; reduced motion stops it on the first frame.
 */
export default function Marquee({
  items,
  tone = 'sand',
  reverse = false,
  className = '',
}: {
  items: string[]
  tone?: keyof typeof TONES
  reverse?: boolean
  className?: string
}) {
  const run = (copy: number) =>
    items.map((item, i) => (
      <span key={`${copy}-${i}`} className="flex shrink-0 items-center gap-6 pr-6">
        <span className="font-display text-3xl md:text-4xl">{item}</span>
        <ArrowRight className="size-7 shrink-0" strokeWidth={2.5} />
      </span>
    ))

  return (
    <div aria-hidden className={`overflow-hidden py-3 ${TONES[tone]} ${className}`}>
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
        {run(0)}
        {run(1)}
      </div>
    </div>
  )
}
