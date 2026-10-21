/**
 * The app's card: a solid surface over the ambient background, with a hairline that brightens on
 * hover when the card is interactive. Use for every grouped block on a dashboard page.
 */
export const CARD = 'rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6'
export const CARD_HOVER =
  'transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[0_18px_40px_-24px_rgb(0_0_0/0.6)]'

/** The small round icon tile at the top of a card. */
export function IconBadge({ icon: Icon, tone = 'sand', className = '' }: { icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; tone?: 'sand' | 'ember' | 'dusk' | 'zest' | 'palm' | 'muted'; className?: string }) {
  const TONES = {
    sand: 'bg-[var(--sand)] text-[var(--on-sand)]',
    ember: 'bg-[var(--ember)] text-[var(--on-ember)]',
    dusk: 'bg-[var(--dusk)] text-[var(--on-dusk)]',
    zest: 'bg-[var(--zest)] text-[var(--on-zest)]',
    palm: 'bg-[var(--palm)] text-[var(--bg)]',
    muted: 'bg-[var(--surface-high)] text-[var(--ink)]',
  }
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]} ${className}`}>
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

/** A member's round initial in their colour. Decorative: always pair it with the name in text. */
export function Avatar({ name, color, size = 'md', className = '' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const SIZES = { sm: 'size-6 text-xs', md: 'size-8 text-sm', lg: 'size-12 text-lg', xl: 'size-16 text-2xl' }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-[var(--on-member)] ${SIZES[size]} ${className}`}
      style={{ background: color }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
