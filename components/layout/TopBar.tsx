'use client';

import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useFamilyStore } from '@/store/family-store';
import { useDismiss } from '@/lib/hooks/useDismiss';
import { getToday } from '@/lib/time/today';
import { getCulturalContext, getCulturalModeLabel, getCulturalModeTooltip } from '@/lib/utils/cultural-context';
import DateSimulator from './DateSimulator';
import QuickActions from './QuickActions';
import SystemPill from './SystemPill';
import ThemeToggle from './ThemeToggle';
import ViewingAsSwitcher from './ViewingAsSwitcher';

export default function TopBar() {
  const today = getToday();
  const dateLabel = `${format(today, 'EEEE')} · ${format(today, 'd MMM yyyy')}`;

  const family = useFamilyStore((s) => s.family);

  // Conditions come from member data, so the dust-season note names whoever actually has asthma.
  const culturalCtx = getCulturalContext(today, family?.members ?? []);
  const culturalLabel = getCulturalModeLabel(culturalCtx);
  const culturalTooltip = getCulturalModeTooltip(culturalCtx);

  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const closeNote = useCallback(() => setNoteOpen(false), []);
  useDismiss(noteRef, noteOpen, closeNote);

  return (
    <header className="fixed left-20 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)]/70 px-6 backdrop-blur-xl">
      {/* Left: family name and the cultural-mode note, when one applies */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display truncate text-2xl text-[var(--ink)]">{family?.name ?? ''}</span>
        {culturalLabel && (
          <div ref={noteRef} className="relative">
            <button
              onClick={() => setNoteOpen((v) => !v)}
              aria-expanded={noteOpen}
              className="rounded-full bg-[var(--zest)] px-3 py-1 text-xs font-semibold text-[var(--on-zest)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]"
            >
              {culturalLabel}
            </button>
            {noteOpen && (
              <div
                role="dialog"
                aria-label={culturalLabel}
                className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] p-4 text-sm leading-relaxed text-[var(--ink-muted)] shadow-2xl"
              >
                <p className="font-statement mb-1.5 text-base text-[var(--ink)]">Adjusted for the season</p>
                {culturalTooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Centre: the date */}
      <span className="hidden text-sm text-[var(--ink-muted)] lg:block">{dateLabel}</span>

      {/* Right: perspective and system state */}
      <div className="flex items-center gap-3">
        <QuickActions />
        <DateSimulator />
        <ViewingAsSwitcher />
        <ThemeToggle />
        <SystemPill />
      </div>
    </header>
  );
}
