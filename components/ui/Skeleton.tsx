import { motion, useReducedMotion } from 'framer-motion';

export function CardSkeleton({ className = '' }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`bg-[var(--surface-container-lowest)] p-6 border-y border-[var(--outline-variant)] ${className}`}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="h-4 w-1/3 bg-[var(--surface-container-high)] mb-4" />
      <div className="space-y-3">
        <div className="h-3 w-full bg-[var(--surface-container-high)]" />
        <div className="h-3 w-5/6 bg-[var(--surface-container-high)]" />
        <div className="h-3 w-4/6 bg-[var(--surface-container-high)]" />
      </div>
    </motion.div>
  );
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`bg-[var(--surface-container-lowest)] p-6 border-y border-[var(--outline-variant)] ${className}`}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="h-4 w-1/4 bg-[var(--surface-container-high)] mb-6" />
      <div className="h-8 w-1/5 bg-[var(--surface-container-high)] mb-4" />
      <div className="flex items-end gap-2 h-24">
        {[30, 60, 40, 80, 100].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--surface-container-high)]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function ListSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={`bg-[var(--surface-container-lowest)] p-6 border-y border-[var(--outline-variant)] ${className}`}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="h-4 w-1/4 bg-[var(--surface-container-high)] mb-6" />
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="size-8 rounded-full bg-[var(--surface-container-high)] shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-[var(--surface-container-high)] w-3/4" />
              <div className="h-3 bg-[var(--surface-container-high)] w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}