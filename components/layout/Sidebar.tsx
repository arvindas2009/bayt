'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarClock,
  HeartPulse,
  Users,
  Shield,
} from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';

const navItems = [
  { label: 'Briefing',    href: '/briefing',    icon: LayoutDashboard },
  { label: 'Operations',  href: '/operations',  icon: CalendarClock },
  { label: 'Health',      href: '/health',      icon: HeartPulse },
  { label: 'Connection',  href: '/connection',  icon: Users },
  { label: 'Caregiver',   href: '/caregiver',   icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const opsOutput = useAgentStore((s) => s.agentOutputs.operations);
  const hasUrgentBriefs = opsOutput?.schoolHealthBriefs?.some(
    (b) => b.urgencyLevel === 'urgent'
  ) ?? false;

  const linkClass = (href: string) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
      pathname === href || pathname.startsWith(href + '/')
        ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]',
    ].join(' ');

  return (
    <aside className="fixed top-0 left-0 h-full w-16 md:w-56 flex flex-col border-r border-[var(--border)] bg-[var(--bg)] z-20 pt-14">
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const showDot = href === '/operations' && hasUrgentBriefs;
          return (
            <Link key={href} href={href} className={linkClass(href)}>
              <span className="relative shrink-0">
                <Icon className="size-5" />
                {showDot && (
                  <span
                    className="absolute -right-1 -top-1 size-2 rounded-full"
                    style={{ background: 'var(--error)' }}
                  />
                )}
              </span>
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Family / Settings pinned at bottom */}
      <div className="p-2 border-t border-[var(--border)]">
        <Link href="/settings" className={linkClass('/settings')}>
          <Users className="size-5 shrink-0" />
          <span className="hidden md:block text-sm font-medium">Family</span>
        </Link>
      </div>
    </aside>
  );
}
