'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import AgentStatusDot from './AgentStatusDot';
import PrivacyVaultBadge from './PrivacyVaultBadge';
import { isDemoMode } from '@/lib/demo/mode';
import { getCulturalContext, getCulturalModeLabel, getCulturalModeTooltip } from '@/lib/utils/cultural-context';

export default function TopBar() {
  const today = new Date();
  const dateLabel = `${format(today, 'EEEE')} · ${format(today, 'd MMM yyyy')}`;

  const culturalCtx = getCulturalContext(today);
  const culturalLabel = getCulturalModeLabel(culturalCtx);
  const culturalTooltip = getCulturalModeTooltip(culturalCtx);

  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <header className="fixed top-0 left-16 right-0 h-14 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg)] z-10 md:left-56">
      {/* Left — family name and optional demo badge */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[var(--text-primary)] tracking-tight">
          Al-Salem
        </span>
        {isDemoMode && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--tertiary)] text-[#1a1a1a] text-[10px] font-mono font-bold uppercase tracking-widest">
            Demo
          </span>
        )}
        {culturalLabel && (
          <div className="relative">
            <button
              onClick={() => setTooltipVisible((v) => !v)}
              onBlur={() => setTooltipVisible(false)}
              className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-80 focus:outline-none"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#fbbf24',
              }}
              aria-label={`Cultural mode active: ${culturalLabel}`}
            >
              {culturalLabel}
            </button>
            {tooltipVisible && (
              <div
                className="absolute left-0 top-full mt-2 w-72 p-3 text-xs leading-relaxed z-50"
                style={{
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                  color: 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#fbbf24' }}>
                  System Adjustments Active
                </p>
                {culturalTooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center — date */}
      <span className="text-sm text-[var(--text-muted)]">{dateLabel}</span>

      {/* Right — privacy vault badge + agent status row */}
      <div className="flex items-center gap-4">
        <PrivacyVaultBadge />
        <AgentStatusDot name="OPS"    status="live" />
        <AgentStatusDot name="HEALTH" status="live" />
        <AgentStatusDot name="CONN"   status="preview" />
        <AgentStatusDot name="CARE"   status="preview" />
      </div>
    </header>
  );
}
