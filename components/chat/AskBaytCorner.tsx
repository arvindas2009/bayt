'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useMotionOK } from '@/lib/hooks/useMotionOK';
import { useViewingAs } from '@/lib/hooks/useViewingAs';
import { ChatHeader, EMPTY, FOCUS_RING, Message, SPRING, Typing, useSuggestions } from '@/components/chat/parts';

/**
 * Ask Bayt on every page but the Briefing (which has its own box): a small round button in the
 * bottom-right corner that widens on hover to say what it is, and springs open into a chat panel.
 * Same conversation as the Briefing's box, kept per "Viewing as" person.
 */

const noop = () => () => {};

export default function AskBaytCorner() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const pathname = usePathname();
  const motionOK = useMotionOK();
  const { id: viewerId, member } = useViewingAs();

  const thread = useChatStore((s) => (viewerId ? s.threads[viewerId] : undefined)) ?? EMPTY;
  const pending = useChatStore((s) => (viewerId ? Boolean(s.pending[viewerId]) : false));
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const ask = useChatStore((s) => s.ask);
  const clear = useChatStore((s) => s.clear);
  const suggestions = useSuggestions(viewerId, pathname);

  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  // A page change (including "Open Load" under an answer) is there to be seen, so the panel steps aside.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (refocus.current) {
      refocus.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end', behavior: motionOK ? 'smooth' : 'auto' });
  }, [open, thread.length, pending, motionOK]);

  if (!mounted || !viewerId || pathname?.startsWith('/briefing')) return null;

  const minimise = () => {
    refocus.current = true;
    setOpen(false);
  };

  const send = (question = draft) => {
    const text = question.trim();
    if (!text || pending) return;
    setDraft('');
    // A suggestion chip disappears once asked; keep focus in the panel so Esc still minimises it.
    inputRef.current?.focus();
    void ask(viewerId, text);
  };

  const answers = thread.filter((m) => m.role === 'bayt').length;

  return createPortal(
    <motion.div
      layout
      transition={SPRING}
      role={open ? 'region' : undefined}
      aria-label={open ? 'Ask Bayt' : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) minimise();
      }}
      style={{ borderRadius: open ? 28 : 24 }}
      // Above page content and the rail (z-30), below modals (z-50).
      className={`fixed bottom-6 right-6 z-40 shadow-[0_24px_60px_-28px_rgb(0_0_0/0.7)] ${
        open
          ? 'flex h-[min(70vh,600px)] w-[min(26rem,calc(100vw-7.5rem))] flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]/90 backdrop-blur-xl'
          : 'bg-[var(--sand)]'
      }`}
    >
      {open ? (
        <>
          <ChatHeader
            name={member?.name}
            onClear={() => {
              clear(viewerId);
              setOpen(true);
              inputRef.current?.focus();
            }}
            onMinimise={minimise}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.18 } }}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            {thread.length === 0 ? (
              <div className="flex min-h-full flex-col justify-end gap-4">
                <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
                  Ask about the family&rsquo;s week, who carries what, or how to find something in Bayt.
                </p>
                <div className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className={`rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-left text-sm text-[var(--ink)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-raised)] active:scale-[0.97] ${FOCUS_RING}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-4">
                {thread.map((m) => (
                  <Message key={m.id} message={m} />
                ))}
                {pending && <Typing />}
              </div>
            )}
            <div ref={endRef} />
          </motion.div>

          <motion.form
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.12 } }}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 border-t border-[var(--line)] p-3"
          >
            <label htmlFor="ask-bayt-corner-input" className="sr-only">
              Ask Bayt about your family
            </label>
            <div className="flex min-w-0 flex-1 rounded-[22px] border border-[var(--line-strong)] bg-[var(--surface-raised)] px-2 transition-colors focus-within:border-[var(--sand-text)]">
              <textarea
                id="ask-bayt-corner-input"
                ref={inputRef}
                rows={Math.min(4, draft.split('\n').length)}
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={thread.length > 0 ? 'Ask a follow-up…' : 'Ask Bayt about your family…'}
                // Inline: the global :focus-visible ring is unlayered, so it beats any utility class.
                style={{ outline: 'none' }}
                className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
              />
            </div>
            <button
              type="submit"
              disabled={!draft.trim() || pending}
              aria-label="Send"
              className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--on-sand)] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`}
            >
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </motion.form>
        </>
      ) : (
        <motion.button
          ref={buttonRef}
          layout="position"
          type="button"
          onClick={() => setOpen(true)}
          aria-label={answers > 0 ? `Ask Bayt, ${answers} ${answers === 1 ? 'answer' : 'answers'} so far` : 'Ask Bayt'}
          className="group flex h-12 items-center rounded-full px-3.5 text-[var(--on-sand)] transition-transform duration-200 active:scale-95"
        >
          <Sparkles className="size-5 shrink-0" aria-hidden />
          {/* Hidden at rest; hover or keyboard focus slides the name out. */}
          <span
            aria-hidden
            className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity,margin] duration-300 ease-out group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-24 group-focus-visible:opacity-100"
          >
            Ask Bayt
          </span>
          {answers > 0 && (
            <span aria-hidden className="num ml-2 rounded-full bg-[var(--on-sand)] px-1.5 text-xs leading-5 text-[var(--sand)]">
              {answers}
            </span>
          )}
        </motion.button>
      )}
    </motion.div>,
    document.body,
  );
}
