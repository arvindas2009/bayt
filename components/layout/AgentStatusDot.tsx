import { motion, useReducedMotion } from 'framer-motion';

type AgentStatus = 'live' | 'preview' | 'idle' | 'thinking';

interface AgentStatusDotProps {
  name: string;
  status: AgentStatus;
}

const statusStyles: Record<AgentStatus, { dot: string; label: string }> = {
  live:     { dot: 'bg-green-400',  label: 'text-green-400' },
  thinking: { dot: 'bg-yellow-400', label: 'text-yellow-400' }, // animate via framer-motion instead
  preview:  { dot: 'bg-blue-400',   label: 'text-blue-400' },
  idle:     { dot: 'bg-[var(--text-muted)]', label: 'text-[var(--text-muted)]' },
};

export default function AgentStatusDot({ name, status }: AgentStatusDotProps) {
  const { dot, label } = statusStyles[status];
  const shouldReduceMotion = useReducedMotion();

  const thinkingAnimate = shouldReduceMotion 
    ? { opacity: [1, 0.5, 1] } 
    : { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] };

  return (
    <div className="flex items-center gap-1.5">
      <motion.span 
        className={`size-2 rounded-full shrink-0 ${dot}`}
        animate={status === 'thinking' ? thinkingAnimate : { scale: 1, opacity: 1 }}
        transition={status === 'thinking' ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      />
      <span className={`text-xs font-mono tracking-wide ${label}`}>{name}</span>
    </div>
  );
}
