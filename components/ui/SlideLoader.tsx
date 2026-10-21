/** Indeterminate sliding bar. `label` is read by screen readers; pass `text` to show it too. */
export default function SlideLoader({ label, text, className = '' }: { label: string; text?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex w-full max-w-xs flex-col items-center gap-3 text-center ${className}`}>
      <div className="slide-track h-1 w-full" aria-hidden>
        <div className="slide-bar" />
      </div>
      {text ? <p className="text-base text-[var(--ink-muted)]">{text}</p> : <span className="sr-only">{label}</span>}
    </div>
  )
}
