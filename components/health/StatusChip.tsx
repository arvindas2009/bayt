import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react'
import { STATUS_WORD, type HealthStatus } from '@/lib/health/status'

const STYLE: Record<HealthStatus, { icon: typeof Eye; className: string }> = {
  good: { icon: CheckCircle2, className: 'bg-[var(--surface-high)] text-[var(--palm)]' },
  monitor: { icon: Eye, className: 'bg-[var(--zest)] text-[var(--on-zest)]' },
  alert: { icon: AlertTriangle, className: 'bg-[var(--ember)] text-[var(--on-ember)]' },
}

/** A health status as icon + word + colour, never colour alone. */
export default function StatusChip({ status, label }: { status: HealthStatus; label?: string }) {
  const { icon: Icon, className } = STYLE[status]
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon className="size-3.5" aria-hidden />
      {label ?? STATUS_WORD[status]}
    </span>
  )
}
