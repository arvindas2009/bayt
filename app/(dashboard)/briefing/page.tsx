'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useBriefingStore } from '@/store/briefing-store';
import { useFamilyStore } from '@/store/family-store';
import MemberBriefingView from '@/components/briefing/MemberBriefingView';
import MemoryCapture from '@/components/briefing/MemoryCapture';
import TimeDividend from '@/components/briefing/TimeDividend';
import FamilyHealthMini from '@/components/briefing/FamilyHealthMini';
import ActiveAlerts from '@/components/briefing/ActiveAlerts';
import InvisibleHoursCard from '@/components/briefing/InvisibleHoursCard';
import AmbientMoodScore from '@/components/briefing/AmbientMoodScore';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import type { FamilyMember } from '@/types';
import type { MemberBriefing } from '@/types/agents';

// ─── Member avatar colors (by index, echoes design system palette) ─────────────

const MEMBER_COLORS = [
  '#3D7FFF',          // Salem — ops blue
  'var(--primary)',   // Fatima — primary purple
  '#2ECC8A',          // Layla — health green
  '#f97316',          // Khalid — orange
  'var(--tertiary)',  // Aisha — gold
];

// ─── Stream Status ──────────────────────────────────────────────────────────────

function StreamStatus() {
  const [text, setText] = useState('Initializing agents...');

  useEffect(() => {
    const states = [
      'Operations Agent thinking...',
      'Operations Agent thinking...',
      'Health Agent thinking...',
      'Health Agent thinking...',
      'Cross-referencing calendars...',
      'Composing briefing...',
      'Composing briefing...',
      'Finalizing insights...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % states.length;
      if (i < states.length) setText(states[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="size-5 animate-spin text-[var(--primary)]" />
      <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] animate-pulse">
        {text}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  if (generating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
        <StreamStatus />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
      <div
        className="flex size-16 items-center justify-center"
        style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container)' }}
      >
        <Sparkles className="size-7 text-[var(--primary)]" />
      </div>
      <div>
        <h2
          className="text-2xl font-bold tracking-tight text-[var(--on-surface)]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          No briefing for today
        </h2>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Generate a fresh intelligence summary for the Al-Salem family
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-3 px-8 py-3 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
      >
        <Sparkles className="size-3.5" />
        Generate today's briefing
      </button>
    </div>
  );
}

// ─── Member switcher ──────────────────────────────────────────────────────────

function MemberSwitcher({
  members,
  activeMemberId,
  onSelect,
}: {
  members: FamilyMember[];
  activeMemberId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-6 px-10 py-3"
      style={{ borderBottom: '1px solid var(--outline-variant)' }}
    >
      {members.map((member, idx) => {
        const isActive = member.id === activeMemberId;
        const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
        return (
          <button
            key={member.id}
            onClick={() => onSelect(member.id)}
            className="flex flex-col items-center gap-1.5 transition-opacity"
            style={{ opacity: isActive ? 1 : 0.45 }}
            title={member.name}
          >
            <div
              className="flex size-9 items-center justify-center text-sm font-bold transition-all"
              style={{
                background: color,
                color: '#0d0b12',
                borderRadius: '50%',
                outline: isActive ? `2px solid ${color}` : 'none',
                outlineOffset: '2px',
              }}
            >
              {member.name[0]}
            </div>
            <span
              className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: isActive ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
            >
              {member.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefingPage() {
  const { currentBriefing, fetchBriefing } = useBriefingStore();
  const family = useFamilyStore((s) => s.family);
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' as const },
    },
  };

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // ── Member switcher state ──────────────────────────────────────────────────
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [memberBriefing, setMemberBriefing] = useState<MemberBriefing | null>(null);
  const [memberBriefingLoading, setMemberBriefingLoading] = useState(false);

  // Default to Fatima when family loads
  useEffect(() => {
    if (family && !activeMemberId) {
      const fatima = family.members.find((m) => m.name === 'Fatima') ?? family.members[0];
      if (fatima) setActiveMemberId(fatima.id);
    }
  }, [family, activeMemberId]);

  // Fetch personalized briefing whenever active member changes
  useEffect(() => {
    if (!activeMemberId) return;
    setMemberBriefingLoading(true);
    setMemberBriefing(null);
    fetch(`/api/briefing/member/${activeMemberId}`)
      .then((r) => r.json())
      .then((data) => setMemberBriefing(data as MemberBriefing))
      .catch(console.error)
      .finally(() => setMemberBriefingLoading(false));
  }, [activeMemberId]);

  useEffect(() => {
    fetchBriefing()
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async (force = false) => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/briefing/generate${force ? '?force=true' : ''}`, { method: 'POST' });
      if (!res.ok) throw new Error('Agent execution failed');
      await fetchBriefing();
    } catch (err) {
      console.error(err);
      toast.error('Agents failed gracefully. Showing cached results.', {
        description: 'One or more agents timed out or encountered an error. The system has automatically fallen back to the last known safe state.',
      });
      await fetchBriefing();
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = () => handleGenerate(true);

  // ── Derive the active member object ───────────────────────────────────────
  const activeMember = family?.members.find((m) => m.id === activeMemberId) ?? null;

  // ── Loading skeletons ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-4 p-10 items-start w-full">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <CardSkeleton className="h-[300px]" />
          <CardSkeleton className="h-[150px]" />
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <ChartSkeleton />
          <CardSkeleton className="h-[250px]" />
          <CardSkeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-6 p-10 text-center">
        <StreamStatus />
      </div>
    );
  }

  if (!currentBriefing) {
    return <EmptyState onGenerate={handleGenerate} generating={generating} />;
  }

  // ── Briefing ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Page toolbar */}
      <div
        className="flex items-center justify-between px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div className="flex items-center gap-4">
          {activeMember ? (
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              Viewing as{' '}
              <span className="text-[var(--on-surface)]">{activeMember.name}</span>
            </span>
          ) : (
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
              Intelligence Summary
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-70">
            Generated{' '}
            {currentBriefing.date
              ? formatDistanceToNow(new Date(currentBriefing.date), { addSuffix: true })
              : 'just now'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={generating}
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)] disabled:opacity-40"
        >
          <RefreshCw className="size-3.5" />
          Regenerate
        </button>
      </div>

      {/* Member switcher */}
      {family && (
        <MemberSwitcher
          members={family.members}
          activeMemberId={activeMemberId}
          onSelect={setActiveMemberId}
        />
      )}

      {/* Two-column grid */}
      <motion.div
        className="grid grid-cols-12 gap-4 p-10 items-start"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Left — 8 cols */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {currentBriefing.invisibleHours && (
            <motion.div variants={itemVariants}>
              <InvisibleHoursCard
                report={currentBriefing.invisibleHours}
                members={family?.members ?? []}
              />
            </motion.div>
          )}

          {/* Personalized member view */}
          <motion.div variants={itemVariants}>
            <AnimatePresence mode="wait">
              {memberBriefingLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardSkeleton className="h-[280px]" />
                </motion.div>
              ) : memberBriefing && activeMember ? (
                <motion.div
                  key={activeMemberId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <MemberBriefingView
                    memberBriefing={memberBriefing}
                    member={activeMember}
                    memoryOfTheDay={currentBriefing.memoryOfTheDay}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {currentBriefing.memoryOfTheDay && activeMember?.role !== 'grandparent' && (
            <motion.div variants={itemVariants}>
              <MemoryCapture memory={currentBriefing.memoryOfTheDay} memoriesThisWeek={5} />
            </motion.div>
          )}
        </div>

        {/* Right — 4 cols */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {currentBriefing.moodScore && (
            <motion.div variants={itemVariants}>
              <AmbientMoodScore score={currentBriefing.moodScore} />
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <TimeDividend
              hoursThisWeek={currentBriefing.timeSavedHours}
              dailyBreakdown={currentBriefing.dailyBreakdown}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <FamilyHealthMini members={family?.members ?? []} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ActiveAlerts alerts={currentBriefing.alerts} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
