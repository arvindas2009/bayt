'use client'

import { motion } from 'framer-motion'
import { Pin, PinOff } from 'lucide-react'
import { toast } from 'sonner'
import { useViewingAs } from '@/lib/hooks/useViewingAs'
import { PINS, type PinId } from '@/lib/pins/registry'
import { usePinStore, usePins } from '@/store/pin-store'

/**
 * Pin a feature to the Briefing of whoever the app is viewed as. Shows its state in words as well
 * as fill, and every change can be undone from the toast.
 */
export default function PinButton({ id, compact = false }: { id: PinId; compact?: boolean }) {
  const viewing = useViewingAs()
  const pins = usePins(viewing.id)
  const toggle = usePinStore((s) => s.toggle)
  const pinned = pins.includes(id)
  const title = PINS[id].title

  const onClick = () => {
    const now = toggle(viewing.id, id)
    toast(now ? `${title} is pinned to the Briefing` : `${title} is off the Briefing`, {
      action: { label: 'Undo', onClick: () => toggle(viewing.id, id) },
    })
  }

  const label = pinned ? `Unpin ${title} from the Briefing` : `Pin ${title} to the Briefing`
  const Icon = pinned && compact ? PinOff : Pin

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pinned}
      aria-label={compact ? label : undefined}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-semibold transition-colors active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)] ${
        compact ? 'size-8 justify-center' : 'px-3 py-1.5'
      } ${
        pinned
          ? compact
            ? 'text-[var(--ink-muted)] hover:bg-[var(--surface-high)] hover:text-[var(--ink)]'
            : 'bg-[var(--sand)] text-[var(--on-sand)]'
          : 'border border-[var(--line-strong)] text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]'
      }`}
    >
      {/* Keyed by state so the pin pops each time it changes. */}
      <motion.span key={String(pinned)} initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
        <Icon className={`size-3.5 ${pinned && !compact ? 'fill-current' : ''}`} aria-hidden />
      </motion.span>
      {!compact && (pinned ? 'Pinned' : 'Pin to Briefing')}
    </button>
  )
}
