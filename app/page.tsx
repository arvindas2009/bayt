'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Settings, HeartPulse, Users, ArrowRight } from 'lucide-react';

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const pillars = [
  {
    code: 'MOD_OPR',
    label: 'Operations',
    icon: Settings,
    description:
      'Logistical orchestration. Shared calendars, task delegation protocols, and inventory management routed through a centralized ledger.',
    dataLoad: 'High',
  },
  {
    code: 'MOD_HLT',
    label: 'Health',
    icon: HeartPulse,
    description:
      'Biometric and wellness tracking. Medical records, appointment scheduling, and dietary requirement matrices held in secure permanence.',
    dataLoad: 'Moderate',
  },
  {
    code: 'MOD_CON',
    label: 'Connection',
    icon: Users,
    description:
      'Relational architecture. Milestone tracking, communication relays, and collective memory archives structured for minimal friction.',
    dataLoad: 'Dynamic',
  },
];

const steps = [
  {
    n: '01',
    title: 'Connect what your family already uses',
    body: 'Calendars, wearables, medical records, school portals — the system reads the signals you already generate.',
  },
  {
    n: '02',
    title: 'Four AI agents work in the background',
    body: 'Operations, Health, Connection, and Caregiver agents run continuously, cross-referencing every data source.',
  },
  {
    n: '03',
    title: 'One daily briefing surfaces what matters',
    body: 'Every morning: a prioritized summary of risks, conflicts, and actions — nothing buried, nothing missed.',
  },
  {
    n: '04',
    title: 'Hours come back to your week',
    body: 'The invisible coordination work that lived in your head moves to the system. You get that time back.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--on-background)]">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--outline-variant)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-10 py-2">
          <span
            className="text-2xl font-bold uppercase tracking-tighter text-[var(--primary)]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            BAYT
          </span>
          <nav className="hidden items-center gap-8 md:flex">
            {['Operations', 'Health', 'Connection'].map((item) => (
              <span
                key={item}
                className="cursor-default font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--primary)]"
              >
                {item}
              </span>
            ))}
          </nav>
          <Link
            href="/briefing"
            className="font-mono text-xs uppercase tracking-widest bg-[var(--primary)] text-[var(--on-primary)] px-4 py-2 transition-opacity hover:opacity-80"
          >
            Open Bayt
          </Link>
        </div>
      </header>

      <main>

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] border-b border-[var(--outline-variant)] px-10 pb-24 pt-32">
          <div className="max-w-5xl">

            <div className="mb-12 border-l-2 border-[var(--primary)] pl-6">
              <motion.h1
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="mb-4 font-bold uppercase leading-none tracking-tighter text-[var(--on-background)]"
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: 'clamp(36px, 5.5vw, 72px)',
                }}
              >
                Your family runs on invisible work.
              </motion.h1>
              <motion.h1
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="font-bold uppercase leading-none tracking-tighter text-[var(--primary)]"
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: 'clamp(36px, 5.5vw, 72px)',
                }}
              >
                Bayt makes it visible.
              </motion.h1>
            </div>

            <div className="flex flex-col items-start justify-between gap-8 border-t border-[var(--outline-variant)] pt-8 md:flex-row">
              <motion.p
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="max-w-2xl font-mono text-xs uppercase leading-relaxed tracking-widest text-[var(--on-surface-variant)]"
              >
                AI infrastructure for the modern family.
                <br />
                <span className="text-[var(--primary)]">Sys.Manifest:</span>{' '}
                Operations. Health. Connection.
                <br />
                Status: Active.
              </motion.p>
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                <Link
                  href="/briefing"
                  className="flex items-center gap-3 border border-[var(--primary)] bg-[var(--primary)] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[var(--on-primary)] transition-opacity hover:opacity-80"
                >
                  Open Bayt
                  <ArrowRight className="size-3.5" />
                </Link>
              </motion.div>
            </div>

          </div>
        </section>

        {/* ── Pillars ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] px-10 py-10">
          <div className="mb-8 flex items-end justify-between border-b border-[var(--outline-variant)] pb-4">
            <h2
              className="text-3xl font-medium uppercase tracking-tight text-[var(--on-background)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Core Modules
            </h2>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              VOL. 01 / SYS. REQ
            </span>
          </div>

          <div className="grid grid-cols-1 border border-[var(--outline-variant)] bg-[var(--surface)] md:grid-cols-3">
            {pillars.map(({ code, label, icon: Icon, description, dataLoad }, i) => (
              <div
                key={code}
                className={[
                  'flex h-full flex-col p-8 transition-colors hover:bg-[var(--surface-container)]',
                  i < 2
                    ? 'border-b border-[var(--outline-variant)] md:border-b-0 md:border-r'
                    : '',
                ].join(' ')}
              >
                <div className="mb-16 flex items-start justify-between border-b border-[var(--outline-variant)] pb-4">
                  <span className="font-mono text-xs text-[var(--primary)]">{code}</span>
                  <Icon className="size-5 text-[var(--on-surface-variant)]" />
                </div>
                <h3
                  className="mb-4 text-3xl font-medium uppercase text-[var(--on-background)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {label}
                </h3>
                <p className="mb-8 flex-grow text-base leading-relaxed text-[var(--on-surface-variant)]">
                  {description}
                </p>
                <div className="flex flex-col gap-2 border-t border-[var(--outline-variant)] pt-4 font-mono text-xs text-[var(--on-surface-variant)]">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-[var(--primary)]">Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Load:</span>
                    <span>{dataLoad}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] border-t border-[var(--outline-variant)] px-10 py-10">
          <div className="mb-8 flex items-end justify-between border-b border-[var(--outline-variant)] pb-4">
            <h2
              className="text-3xl font-medium uppercase tracking-tight text-[var(--on-background)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              How It Works
            </h2>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              VOL. 02 / SEQUENCE
            </span>
          </div>

          <div className="grid grid-cols-1 border border-[var(--outline-variant)] md:grid-cols-2">
            {steps.map(({ n, title, body }, i) => (
              <div
                key={n}
                className={[
                  'flex gap-6 p-8 transition-colors hover:bg-[var(--surface-container)]',
                  // right border on left column
                  i % 2 === 0 ? 'md:border-r border-[var(--outline-variant)]' : '',
                  // bottom border on all but the last row
                  i < 2 ? 'border-b border-[var(--outline-variant)]' : '',
                ].join(' ')}
              >
                <span
                  className="shrink-0 text-5xl font-bold leading-none tracking-tighter text-[var(--outline-variant)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {n}
                </span>
                <div>
                  <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--primary)]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dashboard preview strip ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] px-10 py-10 pb-24">
          <div
            className="relative overflow-hidden border border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]"
            style={{ height: 400 }}
          >
            {/* Terminal header bar */}
            <div className="flex items-center justify-between border-b border-[var(--outline-variant)] bg-[var(--surface)] px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="size-2 bg-[var(--primary)]" />
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
                  Household.Terminal // Live Feed
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--on-surface-variant)]">TTY_01</span>
            </div>

            {/* Ghost wireframe */}
            <div
              className="grid grid-cols-12 opacity-40"
              style={{ height: 'calc(100% - 44px)' }}
            >
              <div className="col-span-3 flex flex-col gap-2 border-r border-[var(--outline-variant)] p-4">
                <div className="mb-4 h-4 w-2/3 bg-[var(--outline-variant)]" />
                <div className="h-2 w-full bg-[var(--surface-variant)]" />
                <div className="h-2 w-4/5 bg-[var(--surface-variant)]" />
                <div className="h-2 w-full bg-[var(--surface-variant)]" />
                <div className="mt-8 h-2 w-3/4 bg-[var(--surface-variant)]" />
                <div className="h-2 w-full bg-[var(--surface-variant)]" />
                <div className="h-2 w-1/2 bg-[var(--surface-variant)]" />
              </div>
              <div className="col-span-9 flex flex-col gap-6 p-8">
                {[
                  { w: 'w-32', accent: true },
                  { w: 'w-48', accent: false },
                  { w: 'w-24', accent: false },
                ].map(({ w, accent }, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border border-[var(--outline-variant)] p-4"
                  >
                    <div className={`h-4 ${w} bg-[var(--outline-variant)]`} />
                    <div
                      className={`h-4 w-16 ${
                        accent ? 'bg-[var(--primary)]' : 'bg-[var(--surface-variant)]'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fade-out gradient */}
            <div
              className="absolute bottom-0 left-0 w-full"
              style={{
                height: 128,
                background: 'linear-gradient(to top, var(--surface-container-lowest), transparent)',
              }}
            />
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--outline-variant)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-4 px-10 py-10 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <span
              className="text-2xl font-bold uppercase tracking-tighter text-[var(--primary)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              BAYT
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              5th Annual COE Hackathon · 2026
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
            AI Infrastructure for the Modern Family
          </p>
        </div>
      </footer>

    </div>
  );
}
