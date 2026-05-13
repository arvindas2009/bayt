'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Share2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ConnectionMemory } from '@/lib/data/mock-connection';

// ─── Member color map ─────────────────────────────────────────────────────────

const MEMBER_COLOR: Record<string, string> = {
  Aisha:  'var(--primary)',
  Salem:  '#9d89e0',
  Fatima: '#cdc0e9',
  Layla:  'var(--tertiary)',
  Khalid: '#8ec7a5',
};

// ─── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  index,
  onOpen,
}: {
  memory: ConnectionMemory;
  index: number;
  onOpen: (m: ConnectionMemory) => void;
}) {
  const color = MEMBER_COLOR[memory.attribution] ?? 'var(--primary)';
  const date = format(parseISO(memory.dateCaptured), 'MMM d');

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      onClick={() => onOpen(memory)}
      className="group flex flex-col gap-3 p-4 text-left"
      style={{
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--outline-variant)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--outline-variant)';
      }}
    >
      {/* Top bar — colored accent */}
      <div className="h-0.5 w-8" style={{ background: color }} />

      {/* Quote */}
      <p
        className="flex-1 text-xs italic leading-relaxed text-[var(--on-surface)] line-clamp-3"
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        &ldquo;{memory.quote}&rdquo;
      </p>

      {/* Footer */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color }}>
            — {memory.attribution}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
            {memory.role}
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          {date}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

function MemoryDialog({
  memory,
  onClose,
}: {
  memory: ConnectionMemory;
  onClose: () => void;
}) {
  const [shared, setShared] = useState(false);
  const color = MEMBER_COLOR[memory.attribution] ?? 'var(--primary)';
  const date = format(parseISO(memory.dateCaptured), 'MMMM d, yyyy');

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={onClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1,  y: 0  }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative flex w-full max-w-lg flex-col gap-6 p-8"
          style={{
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--outline-variant)',
            borderTop: `3px solid ${color}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          {/* Header */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              Memory Vault
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest opacity-50 text-[var(--on-surface-variant)]">
              Captured {date}
            </p>
          </div>

          {/* Full quote */}
          <blockquote
            className="border-l-2 pl-5"
            style={{ borderColor: color }}
          >
            <p
              className="text-base italic leading-relaxed text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              &ldquo;{memory.fullText}&rdquo;
            </p>
            <footer className="mt-4 font-mono text-[10px] uppercase tracking-widest" style={{ color }}>
              — {memory.attribution}, {memory.role}
            </footer>
          </blockquote>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                style={{
                  background: 'var(--surface-container)',
                  color: 'var(--on-surface-variant)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid var(--outline-variant)' }}
          >
            <button
              onClick={() => setShared(true)}
              disabled={shared}
              className="flex items-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
            >
              <Share2 className="size-3.5" />
              {shared ? 'Shared with family' : 'Share with family'}
            </button>
            <button
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function MemoryVault({ memories }: { memories: ConnectionMemory[] }) {
  const [selected, setSelected] = useState<ConnectionMemory | null>(null);

  return (
    <>
      <section className="flex flex-col gap-0">
        <header className="mb-4 flex items-center justify-between px-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            Memory Vault
          </span>
          <div className="flex items-center gap-1.5 opacity-60">
            <BookOpen className="size-3.5" style={{ color: 'var(--primary)' }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
              {memories.length} captured
            </span>
          </div>
        </header>

        {/* 2×3 grid */}
        <div className="grid grid-cols-2 gap-3">
          {memories.map((mem, i) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              index={i}
              onOpen={setSelected}
            />
          ))}
        </div>
      </section>

      {selected && (
        <MemoryDialog memory={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
