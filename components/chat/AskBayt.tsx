'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, MessageSquare, Sparkles } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useMotionOK } from '@/lib/hooks/useMotionOK';
import { useViewingAs } from '@/lib/hooks/useViewingAs';
import { ChatHeader, EMPTY, FOCUS_RING, Message, SPRING, Typing, useSuggestions } from '@/components/chat/parts';

/**
 * "Ask Bayt": a floating box at the bottom of the Briefing (other pages get `AskBaytCorner`). The first question grows it into a
 * chat panel (one framer `layout` animation, so it springs rather than jumps); minimise or Esc
 * shrinks it back and keeps the conversation. Answers come from /api/chat, which writes them from
 * today's fact sheet and labels honestly when they are the facts themselves rather than AI text.
 */

const noop = () => () => {};

export default function AskBayt() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const motionOK = useMotionOK();
  const { id: viewerId, member } = useViewingAs();

  const thread = useChatStore((s) => (viewerId ? s.threads[viewerId] : undefined)) ?? EMPTY;
  const pending = useChatStore((s) => (viewerId ? Boolean(s.pending[viewerId]) : false));
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const ask = useChatStore((s) => s.ask);
  const clear = useChatStore((s) => s.clear);

  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const expanded = open && thread.length > 0;

  const suggestions = useSuggestions(viewerId);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (expanded) endRef.current?.scrollIntoView({ block: 'end', behavior: motionOK ? 'smooth' : 'auto' });
  }, [expanded, thread.length, pending, motionOK]);

  if (!mounted || !viewerId) return null;

  const send = (question = draft) => {
    const text = question.trim();
    if (!text || pending) return;
    setDraft('');
    setOpen(true);
    void ask(viewerId, text);
  };

  const showSuggestions = !expanded && focused && !draft;

  return createPortal(
    // Fixed to the viewport, clear of the 80px rail; only the box itself takes pointer events.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-6 pl-24 pr-4">
      <div
        className="flex w-full max-w-2xl flex-col items-center gap-2"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
              className="pointer-events-auto flex flex-wrap justify-center gap-2"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  // Keep focus in the box, so the chips do not vanish before the click lands.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => send(s)}
                  className={`rounded-full border border-[var(--line-strong)] bg-[var(--surface)]/90 px-3.5 py-1.5 text-sm text-[var(--ink)] backdrop-blur transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-raised)] active:scale-[0.97] ${FOCUS_RING}`}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          layout
          transition={SPRING}
          role="region"
          aria-label="Ask Bayt"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && expanded) setOpen(false);
          }}
          // The box shows focus for its input (the accent border below), so the input draws no ring of its own.
          style={{ borderRadius: expanded ? 28 : 32 }}
          className={`pointer-events-auto flex w-full flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]/90 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.7)] backdrop-blur-xl transition-colors focus-within:border-[var(--sand-text)] ${
            expanded ? 'h-[min(70vh,640px)] max-w-2xl' : 'max-w-xl'
          }`}
        >
          {expanded && <ChatHeader name={member?.name} onClear={() => clear(viewerId)} onMinimise={() => setOpen(false)} />}

          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.18 } }}
              role="log"
              aria-live="polite"
              aria-label="Conversation"
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
            >
              <div className="flex flex-col gap-4">
                {thread.map((m) => (
                  <Message key={m.id} message={m} />
                ))}
                {pending && <Typing />}
                <div ref={endRef} />
              </div>
            </motion.div>
          )}

          <motion.form
            layout="position"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className={`flex items-end gap-2 ${expanded ? 'border-t border-[var(--line)] p-3' : 'p-2'}`}
          >
            {!expanded && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--on-sand)]">
                <Sparkles className="size-5" aria-hidden />
              </span>
            )}
            <label htmlFor="ask-bayt-input" className="sr-only">
              Ask Bayt about your family
            </label>
            {/* Collapsed, the pill itself is the field; expanded, the input gets its own rounded field. */}
            <div
              className={`flex min-w-0 flex-1 ${
                expanded
                  ? 'rounded-[22px] border border-[var(--line-strong)] bg-[var(--surface-raised)] px-2 transition-colors focus-within:border-[var(--sand-text)]'
                  : ''
              }`}
            >
            <textarea
              id="ask-bayt-input"
              ref={inputRef}
              rows={expanded ? Math.min(4, draft.split('\n').length) : 1}
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => {
                if (thread.length > 0) setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={expanded ? 'Ask a follow-up…' : 'Ask Bayt about your family…'}
              // Inline: the global :focus-visible ring is unlayered, so it beats any utility class.
              style={{ outline: 'none' }}
              className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
            </div>
            {!expanded && thread.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 text-sm text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)] ${FOCUS_RING}`}
              >
                <MessageSquare className="size-4" aria-hidden />
                <span className="num">{thread.filter((m) => m.role === 'bayt').length}</span>
                <span className="sr-only">answers, open the conversation</span>
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || pending}
              aria-label="Send"
              className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--on-sand)] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
            >
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </motion.form>
        </motion.section>
      </div>
    </div>,
    document.body,
  );
}
