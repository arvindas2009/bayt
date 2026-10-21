'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sunrise, Orbit, CalendarClock, HeartPulse, House, type LucideIcon } from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';

const navItems = [
  { label: 'Briefing',   href: '/briefing',   icon: Sunrise },
  { label: 'Load',       href: '/load',       icon: Orbit },
  { label: 'Operations', href: '/operations', icon: CalendarClock },
  { label: 'Health',     href: '/health',     icon: HeartPulse },
];

/** A compact rail: icon with its label underneath. The lime pill slides to the current page. */
export default function Sidebar() {
  const pathname = usePathname();
  const opsOutput = useAgentStore((s) => s.agentOutputs.operations);
  const hasUrgentBriefs = opsOutput?.schoolHealthBriefs?.some(
    (b) => b.urgencyLevel === 'urgent'
  ) ?? false;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed top-0 left-0 z-30 flex h-full w-20 flex-col items-center border-r border-[var(--line)] bg-[var(--bg)]/70 backdrop-blur-xl">
      {/* Wordmark sits level with the top bar */}
      <Link href="/" aria-label="Bayt home" className="flex h-14 flex-col items-center justify-center leading-none">
        <span className="font-display text-2xl text-[var(--ink)]">Bayt</span>
        <span lang="ar" dir="rtl" className="!leading-none text-xs font-semibold text-[var(--sand-text)]">بيت</span>
      </Link>

      <nav aria-label="Primary" className="mt-3 flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-1.5">
        {navItems.map(({ label, href, icon }) => {
          // An urgent school health brief: the dot shows, and the link opens the School tab.
          const urgent = href === '/operations' && hasUrgentBriefs;
          return (
            <RailLink
              key={href}
              label={label}
              href={urgent ? '/operations?tab=school' : href}
              icon={icon}
              active={isActive(href)}
              dot={urgent}
            />
          );
        })}
      </nav>

      {/* Family / settings pinned at the bottom */}
      <div className="w-full border-t border-[var(--line)] px-1.5 py-3">
        <RailLink label="Family" href="/settings" icon={House} active={isActive('/settings')} />
      </div>
    </aside>
  );
}

function RailLink({ label, href, icon: Icon, active, dot = false }: { label: string; href: string; icon: LucideIcon; active: boolean; dot?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors ${
        active ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
      }`}
    >
      <span className="relative flex h-9 w-14 items-center justify-center">
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="absolute inset-0 rounded-full bg-[var(--sand)]"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
        {!active && (
          <span className="absolute inset-0 scale-75 rounded-full bg-[var(--surface-raised)] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
        )}
        <Icon
          className={`relative size-5 transition-transform duration-200 group-hover:-translate-y-0.5 ${active ? 'text-[var(--on-sand)]' : ''}`}
          aria-hidden
        />
        {dot && (
          <span
            aria-label="Urgent item"
            className="absolute right-2.5 top-1 size-2 rounded-full bg-[var(--ember)] ring-2 ring-[var(--bg)]"
          />
        )}
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}
