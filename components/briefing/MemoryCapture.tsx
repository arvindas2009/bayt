'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { CapturedMemory } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  memory: CapturedMemory;
  memoriesThisWeek?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemoryCapture({ memory, memoriesThisWeek }: Props) {
  const formattedDate = format(parseISO(memory.dateCaptured), 'MMMM d, yyyy');

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-[var(--surface-container-lowest)] p-6"
      style={{
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Memory Vault
        </span>
        <div className="flex items-center gap-1.5 opacity-50">
          <BookOpen className="size-3.5" style={{ color: 'var(--primary)' }} />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--primary)' }}
          >
            Connection
          </span>
        </div>
      </header>

      {/* Quote */}
      <blockquote
        className="border-l-2 pl-5"
        style={{ borderColor: 'var(--primary-container)' }}
      >
        <p
          className="text-base italic leading-relaxed text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          &ldquo;{memory.quote}&rdquo;
        </p>
        <footer className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
          — {memory.attribution}, captured {formattedDate}
        </footer>
      </blockquote>

      {/* Optional: more memories this week */}
      {memoriesThisWeek !== undefined && memoriesThisWeek > 0 && (
        <div className="mt-5" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
          <Link
            href="/connection"
            className="font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-[var(--on-surface)]"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            +{memoriesThisWeek} captured this week →
          </Link>
        </div>
      )}
    </motion.section>
  );
}
