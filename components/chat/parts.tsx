'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Lock, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import Highlight from '@/components/ui/Highlight';
import WhyPopover from '@/components/ui/WhyPopover';
import { IconBadge } from '@/components/ui/Card';
import type { ChatMessage } from '@/store/chat-store';
import { useBriefingStore } from '@/store/briefing-store';
import { useMemberLookup } from '@/lib/hooks/useMemberLookup';
import { useMotionOK } from '@/lib/hooks/useMotionOK';
import type { ChatPage } from '@/lib/chat/answer';

/** Pieces shared by the Briefing's Ask Bayt box and the corner button on every other page. */

export const SPRING = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 } as const;
export const EMPTY: ChatMessage[] = [];

export const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]';

const MODE_LABEL: Record<NonNullable<ChatMessage['mode']>, string> = {
  ai: 'Written by AI from today’s data',
  demo: 'Demo mode: the matching facts, no AI',
  unavailable: 'AI unavailable: the matching facts',
  unchecked: 'The AI answer did not match the data, so here are the facts',
  private: 'Health details stay out of AI chat',
  error: '',
};

const PAGE_LABEL: Record<ChatPage, string> = {
  '/briefing': 'Briefing',
  '/load': 'Load',
  '/load#resilience': 'Resilience Mode',
  '/operations?tab=calendar': 'Calendar',
  '/operations?tab=school': 'School',
  '/operations?tab=meals': 'Meals',
  '/health': 'Health',
  '/settings': 'Settings',
};

/** One question that fits the page being looked at, asked first. */
const PAGE_SUGGESTION: [prefix: string, question: string][] = [
  ['/operations', 'What is due this week?'],
  ['/health', 'Who gives the medications, and who backs them up?'],
  ['/settings', 'What does the Privacy Vault do?'],
];

/** Built from the family's own data, so every suggestion has an answer. */
export function useSuggestions(viewerId: string | null | undefined, pathname?: string | null) {
  const { nameOf } = useMemberLookup();
  const topId = useBriefingStore((s) => [...(s.currentBriefing?.load?.members ?? [])].sort((a, b) => b.hours - a.hours)[0]?.memberId);
  return useMemo(() => {
    const away = !topId ? null : topId === viewerId ? 'What happens if I am away for two weeks?' : `What happens if ${nameOf(topId)} is away?`;
    const page = pathname ? PAGE_SUGGESTION.find(([prefix]) => pathname.startsWith(prefix))?.[1] : undefined;
    return [page, 'What should I do first today?', 'Who carries the most this week?', away]
      .filter((s): s is string => Boolean(s))
      .slice(0, 3);
  }, [topId, viewerId, nameOf, pathname]);
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] active:scale-95 ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

export function ChatHeader({ name, onClear, onMinimise }: { name?: string; onClear: () => void; onMinimise: () => void }) {
  return (
    <motion.header
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.12 } }}
      className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3.5"
    >
      <IconBadge icon={Sparkles} tone="sand" />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl leading-none text-[var(--ink)]">Ask Bayt</h2>
        <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">Answers from today&rsquo;s data, for {name}</p>
      </div>
      <IconButton label="New conversation" onClick={onClear}>
        <RotateCcw className="size-4" aria-hidden />
      </IconButton>
      <IconButton label="Minimise" onClick={onMinimise}>
        <ChevronDown className="size-5" aria-hidden />
      </IconButton>
    </motion.header>
  );
}

export function Typing() {
  const motionOK = useMotionOK();
  return (
    <div className="flex items-center gap-3" aria-label="Bayt is writing">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--on-sand)]">
        <Sparkles className="size-3.5" aria-hidden />
      </span>
      <span className="flex gap-1.5 rounded-2xl bg-[var(--surface-high)] px-4 py-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-[var(--ink-muted)]"
            animate={motionOK ? { y: [0, -4, 0], opacity: [0.5, 1, 0.5] } : undefined}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </span>
    </div>
  );
}

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--surface-high)] px-4 py-2.5 text-[15px] text-[var(--ink)]"
      >
        <span className="sr-only">You: </span>
        {message.text}
      </motion.div>
    );
  }

  const label = message.mode ? MODE_LABEL[message.mode] : '';
  const LabelIcon = message.mode === 'ai' ? Sparkles : message.mode === 'private' ? Lock : TriangleAlert;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-[92%] gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--on-sand)]">
        <Sparkles className="size-3.5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="sr-only">Bayt:</span>
        {message.text.split('\n').map((line, i) => (
          <p key={i} className={`text-[15px] leading-relaxed ${message.mode === 'error' ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`}>
            <Highlight text={line} />
          </p>
        ))}
        {(label || message.sources?.length || message.page) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--ink-muted)]">
            {label && (
              <span className="inline-flex items-center gap-1.5">
                <LabelIcon className="size-3.5" aria-hidden />
                {label}
              </span>
            )}
            <WhyPopover sources={message.sources} />
            {message.page && (
              <Link
                href={message.page}
                className={`inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] ${FOCUS_RING}`}
              >
                Open {PAGE_LABEL[message.page]} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
