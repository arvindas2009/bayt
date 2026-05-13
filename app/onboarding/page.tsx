'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Heart, Activity, GraduationCap,
  MessageCircle, Watch, ShoppingBag, UserPlus, Check,
  ArrowRight, Power,
} from 'lucide-react';
import type { FamilyMember } from '@/types';

// ─── Terminal palette (local to onboarding, not the dashboard purple) ─────────
const C = {
  bg:      '#0a0c10',
  surface: '#131314',
  surfaceLow: '#1c1b1c',
  surfaceLowest: '#0e0e0e',
  border:  '#1E2A38',
  blue:    '#3D7FFF',
  green:   '#2ECC8A',
  text:    '#e5e2e2',
  muted:   '#8e9194',
  dimText: '#c4c7ca',
} as const;

// ─── Step transition ──────────────────────────────────────────────────────────
const stepVariants = {
  enter:  { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:   { opacity: 0, x: -16, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  parent:      'Primary Operator',
  child:       'Dependent',
  grandparent: 'Senior Member',
};

const DATA_SOURCES = [
  { id: 'gcal',        name: 'Google Calendar',   sub: 'Calendar & Events',    icon: CalendarDays },
  { id: 'apple-health',name: 'Apple Health',       sub: 'Biometrics & Vitals',  icon: Heart },
  { id: 'google-fit',  name: 'Google Fit',         sub: 'Activity & Fitness',   icon: Activity },
  { id: 'adu-school',  name: 'ADU School Portal',  sub: 'Academics & Alerts',   icon: GraduationCap },
  { id: 'whatsapp',    name: 'WhatsApp',            sub: 'On-Device Messages',   icon: MessageCircle },
  { id: 'garmin',      name: 'Garmin',             sub: 'Wearable Telemetry',   icon: Watch },
  { id: 'noon-food',   name: 'Noon Food',          sub: 'Nutrition & Orders',   icon: ShoppingBag },
];

const MODULES = [
  { label: 'Module 01', name: 'Logistics Core',   online: true },
  { label: 'Module 02', name: 'Health Matrix',     online: true },
  { label: 'Module 03', name: 'Connection Relay',  online: true },
  { label: 'Module 04', name: 'Caregiver Guard',   online: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="relative shrink-0 h-5 w-9 cursor-pointer transition-colors"
      style={{
        background: on ? C.green : C.border,
        border: `1px solid ${on ? C.green : C.muted}`,
      }}
    >
      <span
        className="absolute top-0.5 size-3.5 transition-transform"
        style={{
          background: on ? C.bg : C.muted,
          left: 2,
          transform: on ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

function MemberCard({ member, index }: { member: FamilyMember; index: number }) {
  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${C.border}` }}>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
          ID: {String(index + 1).padStart(3, '0')}
        </span>
        <span className="size-2 rounded-none" style={{ background: C.green }} />
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          Given Name
        </p>
        <p className="font-mono text-sm" style={{ color: C.text }}>{member.name}</p>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          Role Designation
        </p>
        <p className="font-mono text-sm" style={{ color: C.dimText }}>
          {ROLE_LABELS[member.role] ?? member.role}
        </p>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          Age
        </p>
        <p className="font-mono text-sm" style={{ color: C.dimText }}>{member.age}</p>
      </div>
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

const STEPS = [
  { n: 1, code: 'INIT',   label: 'Identity Matrix' },
  { n: 2, code: 'DATA',   label: 'Infrastructure'  },
  { n: 3, code: 'READY',  label: 'Protocols'       },
];

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map(({ n, code, label }, i) => {
        const done    = current > n;
        const active  = current === n;
        const pending = current < n;
        return (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex size-5 items-center justify-center font-mono text-[10px]"
                style={{
                  background: done ? C.green : active ? C.blue : 'transparent',
                  border: `1px solid ${done ? C.green : active ? C.blue : C.border}`,
                  color: done || active ? C.bg : C.muted,
                }}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} /> : n}
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest leading-none"
                  style={{ color: active ? C.blue : done ? C.green : C.muted }}
                >
                  {code}
                </span>
                <span className="font-mono text-[10px] leading-none mt-0.5" style={{ color: C.muted }}>
                  {label}
                </span>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px" style={{ background: done ? C.green : C.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step screens ─────────────────────────────────────────────────────────────

function Step1({
  members,
  loading,
  onContinue,
}: {
  members: FamilyMember[];
  loading: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col md:flex-row overflow-hidden">

      {/* Sidebar */}
      <aside
        className="w-full md:w-64 shrink-0 flex flex-col"
        style={{ borderRight: `1px solid ${C.border}`, background: C.surface }}
      >
        <div className="p-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: C.muted }}>
            SYS.INIT_SEQUENCE
          </p>
          <div className="flex flex-col gap-5">
            {STEPS.map(({ n, code, label }) => {
              const active = n === 1;
              return (
                <div key={n} className={`flex items-start gap-3 ${n > 1 ? 'opacity-40' : ''}`}>
                  <div
                    className="flex size-6 shrink-0 items-center justify-center font-mono text-[10px]"
                    style={{
                      background: active ? C.blue : 'transparent',
                      border: `1px solid ${active ? C.blue : C.border}`,
                      color: active ? C.bg : C.text,
                    }}
                  >
                    {String(n).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: active ? C.blue : C.muted }}>{code}</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: C.muted }}>{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-auto p-6" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest">
            <span style={{ color: C.muted }}>STATUS:</span>
            <span style={{ color: C.blue }}>AWAITING INPUT</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="flex flex-1 flex-col overflow-y-auto">
        <div className="p-8" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h1 className="font-mono text-3xl font-bold tracking-tight mb-2" style={{ color: C.text }}>
            Who's in your family?
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>
            Register primary operators and sub-entities within the habitat cluster.
          </p>
        </div>

        <div className="flex-1 p-8">
          {loading ? (
            <div className="font-mono text-xs uppercase tracking-widest animate-pulse" style={{ color: C.blue }}>
              Scanning registry...
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
              style={{ background: C.border, border: `1px solid ${C.border}` }}
            >
              {members.map((m, i) => (
                <MemberCard key={m.id} member={m} index={i} />
              ))}
              {/* Add member stub */}
              <button
                className="flex flex-col items-center justify-center gap-2 p-8 transition-colors"
                style={{
                  background: C.surface,
                  borderBottom: `1px solid ${C.border}`,
                  cursor: 'default',
                  opacity: 0.5,
                }}
                disabled
              >
                <UserPlus className="size-6" style={{ color: C.muted }} />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                  Register New Entity
                </span>
              </button>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between p-6 mt-auto"
          style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
            {members.length} entities registered
          </span>
          <button
            onClick={onContinue}
            className="flex items-center gap-3 px-8 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{ background: C.blue, color: C.bg }}
          >
            Execute Step 02
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}

function Step2({
  toggles,
  onToggle,
  onContinue,
}: {
  toggles: Record<string, boolean>;
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  const connectedCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-8 gap-8 max-w-5xl mx-auto w-full">
      <div style={{ borderBottom: `1px solid ${C.border}` }} className="pb-6">
        <h1 className="font-mono text-3xl font-bold tracking-tight mb-2" style={{ color: C.text }}>
          Connect Your Data
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: C.muted }}>
          SYSTEM REQUIRES ACCESS TO EXTERNAL DATA SOURCES. SELECT NODES TO AUTHORIZE CONNECTION.
        </p>
      </div>

      {/* Source grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px"
        style={{ background: C.border, border: `1px solid ${C.border}` }}
      >
        {DATA_SOURCES.map(({ id, name, sub, icon: Icon }) => {
          const on = toggles[id] ?? true;
          return (
            <div
              key={id}
              className="flex flex-col p-5 gap-4"
              style={{ background: C.surface }}
            >
              <div className="flex items-start justify-between" style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 4 }}>
                <Icon className="size-7" style={{ color: on ? C.text : C.muted }} />
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: on ? C.green : C.muted }}
                  >
                    {on ? 'CONNECTED' : 'PENDING'}
                  </span>
                  <Toggle on={on} onChange={() => onToggle(id)} />
                </div>
              </div>
              <div>
                <p className="font-mono text-sm font-medium" style={{ color: C.text }}>{name}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: C.muted }}>
                  {sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal log */}
      <div
        className="p-4"
        style={{ border: `1px solid ${C.border}`, background: C.surfaceLowest }}
      >
        <div
          className="flex items-center justify-between pb-2 mb-3 font-mono text-[10px] uppercase tracking-widest"
          style={{ borderBottom: `1px solid ${C.border}`, color: C.muted }}
        >
          <span>SYSTEM LOG</span>
          <span style={{ color: C.green }}>{connectedCount}/{DATA_SOURCES.length} nodes active</span>
        </div>
        <div className="space-y-1 font-mono text-xs" style={{ color: C.muted }}>
          <div className="flex gap-3">
            <span style={{ color: C.blue, opacity: 0.6 }}>[SYS]</span>
            <span>Establishing secure connection to BAYT OS core...</span>
          </div>
          {DATA_SOURCES.slice(0, connectedCount).map((s) => (
            <div key={s.id} className="flex gap-3">
              <span style={{ color: C.blue, opacity: 0.6 }}>[OK]</span>
              <span style={{ color: C.green }}>{s.name} node synchronized successfully.</span>
            </div>
          ))}
          <div className="flex gap-2 animate-pulse" style={{ color: C.blue }}>
            <span>&gt;_</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between pt-6 mt-auto"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
          {connectedCount} sources authorized
        </span>
        <button
          onClick={onContinue}
          className="flex items-center gap-3 px-8 py-3 font-mono text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-80"
          style={{ background: C.blue, color: C.bg }}
        >
          Proceed to Phase 03
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function Step3({
  toggles,
  memberCount,
}: {
  toggles: Record<string, boolean>;
  memberCount: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 847;
    const duration = 1600;
    const interval = 16;
    const step = target / (duration / interval);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const connectedSources = DATA_SOURCES.filter((s) => toggles[s.id] !== false);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-8 gap-8 max-w-5xl mx-auto w-full">

      {/* Phase strip */}
      <div
        className="grid grid-cols-3 gap-px"
        style={{ background: C.border, border: `1px solid ${C.border}` }}
      >
        {[
          { phase: 'Phase 01', name: 'System Init',   done: true,   active: false },
          { phase: 'Phase 02', name: 'Data Sync',     done: true,   active: false },
          { phase: 'Phase 03', name: 'Terminal Ready', done: false, active: true  },
        ].map(({ phase, name, done, active }) => (
          <div
            key={phase}
            className="p-4 flex flex-col gap-1"
            style={{
              background: active ? '#dee3e8' : C.surface,
              opacity: !done && !active ? 0.4 : 1,
            }}
          >
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: active ? C.bg : C.muted }}
            >
              {phase}
            </span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: active ? C.bg : C.dimText }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Hero split */}
      <div
        className="flex flex-col lg:flex-row gap-px"
        style={{ background: C.border, border: `1px solid ${C.border}` }}
      >
        {/* Left — narrative */}
        <div className="flex flex-col justify-between p-8 lg:w-2/3 min-h-[320px]" style={{ background: C.surface }}>
          <div>
            <h1
              className="font-mono text-5xl font-bold uppercase tracking-tight mb-4 leading-tight"
              style={{ color: C.text }}
            >
              Your family<br />is ready.
            </h1>
            <p className="font-mono text-sm leading-relaxed max-w-md" style={{ color: C.muted }}>
              All infrastructural modules have been calibrated to your household's specifications. The underlying architecture is sound. Awaiting final operational command to engage standard protocols.
            </p>
          </div>
          <div
            className="mt-6 flex w-fit items-center gap-3 p-3"
            style={{ border: `1px solid ${C.border}`, background: C.surfaceLowest }}
          >
            <div className="size-2 shrink-0" style={{ background: C.green }} />
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.text }}>
              System Status: Optimal
            </span>
          </div>
        </div>

        {/* Right — counter */}
        <div
          className="flex flex-col lg:w-1/3"
          style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}
        >
          <div
            className="flex items-center justify-between p-3 font-mono text-[10px] uppercase tracking-widest"
            style={{ borderBottom: `1px solid ${C.border}`, background: C.surfaceLow, color: C.muted }}
          >
            <span>Telemetry Scan</span>
            <span style={{ color: C.green }}>●</span>
          </div>
          <div className="flex flex-1 flex-col items-start justify-center p-8" style={{ background: C.surfaceLowest }}>
            <div className="flex items-center gap-2 mb-4">
              <Check className="size-4" style={{ color: C.green }} />
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.green }}>
                Analysis Complete
              </span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-1" style={{ color: C.text }}>
              Volumes Ingested
            </p>
            <span
              className="font-mono font-bold leading-none tabular-nums"
              style={{ fontSize: 72, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}
            >
              {count}
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: C.muted }}>
              Data points detected
            </p>
          </div>
        </div>
      </div>

      {/* Module summary */}
      <div style={{ border: `1px solid ${C.border}`, background: C.surface }}>
        <div
          className="flex items-center justify-between p-3 font-mono text-[10px] uppercase tracking-widest"
          style={{ borderBottom: `1px solid ${C.border}`, background: C.surfaceLow, color: C.text }}
        >
          <span>Family Briefing Preview</span>
          <span style={{ color: C.muted }}>{connectedSources.length} sources · {memberCount} profiles</span>
        </div>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-px"
          style={{ background: C.border }}
        >
          {MODULES.map(({ label, name, online }) => (
            <div key={label} className="flex flex-col gap-2 p-4" style={{ background: C.surface }}>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                {label}
              </span>
              <span className="font-mono text-sm" style={{ color: C.text }}>{name}</span>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="size-2 shrink-0"
                  style={{
                    background: online ? C.green : 'transparent',
                    border: online ? 'none' : `1px solid ${C.border}`,
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: online ? C.muted : C.muted }}>
                  {online ? 'Online' : 'Pending Sync'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex justify-end pt-6 mt-auto"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <Link
          href="/briefing"
          className="flex items-center gap-4 px-8 py-4 font-mono text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-80"
          style={{ background: C.blue, color: C.bg }}
        >
          <span>Engage System</span>
          <Power className="size-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DATA_SOURCES.map((s) => [s.id, true]))
  );

  useEffect(() => {
    fetch('/api/family')
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: 'var(--font-jetbrains-mono), monospace' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between w-full px-8 h-14"
        style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
      >
        <span className="font-mono text-xl font-bold uppercase tracking-tighter" style={{ color: C.text }}>
          BAYT
        </span>
        <ProgressBar current={step} />
        <span className="font-mono text-[10px] uppercase tracking-widest hidden sm:block" style={{ color: C.muted }}>
          SETUP TERMINAL
        </span>
      </header>

      {/* Step content */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex flex-1 flex-col w-full"
          >
            {step === 1 && (
              <Step1
                members={members}
                loading={loading}
                onContinue={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2
                toggles={toggles}
                onToggle={handleToggle}
                onContinue={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3
                toggles={toggles}
                memberCount={members.length}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
