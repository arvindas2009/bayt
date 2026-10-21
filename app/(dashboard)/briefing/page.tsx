'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Clock, Flame, Orbit, RefreshCw, Scale } from 'lucide-react';
import SlideLoader from '@/components/ui/SlideLoader';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAgentStore } from '@/store/agent-store';
import { useBriefingStore } from '@/store/briefing-store';
import { useFamilyStore } from '@/store/family-store';
import { useFlows } from '@/lib/hooks/useFlows';
import { useLoadBodies } from '@/lib/hooks/useLoadBodies';
import { useViewingAs } from '@/lib/hooks/useViewingAs';
import { useMemberLookup } from '@/lib/hooks/useMemberLookup';
import { BURNOUT_THRESHOLD } from '@/lib/load/reference-durations';
import { usePageBusy } from '@/lib/hooks/usePageBusy';
import { isDemoMode } from '@/lib/demo/mode';
import HandoffInbox from '@/components/handoffs/HandoffInbox';
import MicroActions from '@/components/briefing/MicroActions';
import PriorityHero from '@/components/briefing/PriorityHero';
import TimeBack from '@/components/briefing/TimeBack';
import { CardSkeleton } from '@/components/ui/Skeleton';
import LoadFieldLazy from '@/components/visual/LoadFieldLazy';
import { CARD, IconBadge } from '@/components/ui/Card';
import { Reveal } from '@/components/motion/Reveal';
import PageHeader from '@/components/layout/PageHeader';
import PinnedBoard from '@/components/pins/PinnedBoard';
import AskBayt from '@/components/chat/AskBayt';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/components/ui/Button';
import type { MemberBriefing } from '@/types/agents';
import { getToday } from '@/lib/time/today'

// ─── Waiting states ─────────────────────────────────────────────────────────────

function Working() {
  return <SlideLoader label="Writing today's briefing" text="Reading the calendar and writing today’s briefing…" />;
}

function EmptyState({ onGenerate, familyName }: { onGenerate: () => void; familyName?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-10 text-center">
      <div>
        <h1 className="font-display text-5xl text-[var(--ink)]">No briefing for today yet</h1>
        <p className="mt-2 text-base text-[var(--ink-muted)]">
          Bayt will read this week&rsquo;s calendar and tasks for the {familyName ?? ''} family.
        </p>
      </div>
      <button onClick={onGenerate} className={BUTTON_PRIMARY}>
        Write today&rsquo;s briefing
      </button>
    </div>
  );
}

// ─── Heading parts ────────────────────────────────────────────────────────────

/**
 * The greeting with the person's name underlined in their member colour (ink stays ink, so it reads in
 * both themes). An underline, not a band: the display type has tight leading, and a band behind the
 * name ran into the next line when a long greeting wrapped.
 */
function Greeting({ text, name, color }: { text: string; name?: string; color?: string }) {
  const at = name ? text.indexOf(name) : -1;
  if (!name || !color || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span
        style={{
          textDecorationLine: 'underline',
          textDecorationColor: color,
          textDecorationThickness: '0.09em',
          textUnderlineOffset: '0.06em',
          textDecorationSkipInk: 'none',
        }}
      >
        {name}
      </span>
      {text.slice(at + name.length)}
    </>
  );
}

function Chip({ icon: Icon, tone = 'plain', children }: { icon: typeof Clock; tone?: 'plain' | 'ember'; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        tone === 'ember' ? 'bg-[var(--ember)] text-[var(--on-ember)]' : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]'
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      {/* One box, so the flex gap never lands between words and punctuation. */}
      <span>{children}</span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

async function getMemberBriefing(url: string): Promise<MemberBriefing> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Member briefing failed: ${res.status}`);
  return res.json() as Promise<MemberBriefing>;
}

export default function BriefingPage() {
  const { currentBriefing, fetchBriefing, setMemberBriefing } = useBriefingStore();
  const family = useFamilyStore((s) => s.family);
  const { agentOutputs, runAgent } = useAgentStore();
  const { bodies, figures, ariaLabel: fieldLabel, ready: fieldReady } = useLoadBodies();
  const { colorOf } = useMemberLookup();
  const { flows, trigger: triggerFlow } = useFlows();
  const { member: activeMember, id: activeMemberId, settled } = useViewingAs();
  const memberBriefing = useBriefingStore((s) => (activeMemberId ? s.memberBriefings[activeMemberId]?.briefing : undefined));

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [memberFailedId, setMemberFailedId] = useState<string | null>(null);

  // The personal briefing follows the global "Viewing as" control, and waits until the default
  // person is known so no model call is spent on someone else first. The deterministic version
  // comes back at once; the worded one replaces it when the model has written it. A superseded
  // request is ignored, so a slow answer for the previous person never lands on the current one.
  useEffect(() => {
    if (!settled || !activeMemberId) return;
    let cancelled = false;
    const id = activeMemberId;
    const url = `/api/briefing/member/${id}`;
    setMemberFailedId(null);

    const plain = isDemoMode
      ? Promise.reject(new Error('demo mode serves the plain version only'))
      : getMemberBriefing(`${url}?wording=skip`).then((b) => {
          if (!cancelled) setMemberBriefing(id, b, false);
        });
    const worded = getMemberBriefing(url).then((b) => {
      if (!cancelled) setMemberBriefing(id, b, true);
    });
    Promise.allSettled([plain, worded]).then((results) => {
      if (cancelled || results.some((r) => r.status === 'fulfilled')) return;
      console.error('member briefing:', results);
      setMemberFailedId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [settled, activeMemberId, setMemberBriefing]);

  useEffect(() => {
    fetchBriefing()
      .catch(console.error)
      .finally(() => setLoading(false));
    // Served from today's stored run, so opening the page does not call a model again.
    runAgent('connection');
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
      toast.error('Could not write a new briefing. Showing the last one.');
      await fetchBriefing();
    } finally {
      setGenerating(false);
    }
  };

  const memberFailed = memberFailedId !== null && memberFailedId === activeMemberId;
  // The top bar keeps running until the page has something real to show.
  usePageBusy((loading && !currentBriefing) || (Boolean(currentBriefing) && !memberBriefing && !memberFailed));

  // A briefing kept from an earlier visit shows straight away while it is refreshed.
  if (loading && !currentBriefing) {
    return (
      <div className="flex flex-col gap-6 p-10">
        <CardSkeleton className="h-[240px]" />
        <CardSkeleton className="h-[180px]" />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-10">
        <Working />
      </div>
    );
  }

  if (!currentBriefing) return <EmptyState onGenerate={() => handleGenerate()} familyName={family?.name} />;

  const large = activeMember?.role === 'grandparent';
  const greeting = memberBriefing?.greeting ?? (activeMember ? `Good day, ${activeMember.name}` : 'Good day');
  const myLoad = figures.find((f) => f.memberId === activeMemberId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-10 pb-36 pt-8">
      <PageHeader
        shortTitle="Briefing"
        title={
          // Keyed by text: fades when the model's wording replaces the plain greeting.
          <motion.span key={greeting} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <Greeting text={greeting} name={activeMember?.name} color={activeMemberId ? colorOf(activeMemberId) : undefined} />
          </motion.span>
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <Chip icon={CalendarDays}>{format(getToday(), 'EEEE d MMMM')}</Chip>
            {currentBriefing.date && <Chip icon={Clock}>Written {formatDistanceToNow(new Date(currentBriefing.date), { addSuffix: true })}</Chip>}
            {myLoad &&
              (myLoad.score >= BURNOUT_THRESHOLD ? (
                <Chip icon={Flame} tone="ember">
                  Your load <span className="num">{myLoad.score}/100</span>, over the line
                </Chip>
              ) : (
                <Chip icon={Scale}>
                  Your load <span className="num">{myLoad.score}/100</span>
                </Chip>
              ))}
          </div>
        }
        actions={
          <button onClick={() => handleGenerate(true)} className={BUTTON_SECONDARY}>
            <RefreshCw className="size-3.5" aria-hidden />
            Write it again
          </button>
        }
      />

      {memberBriefing ? (
        <PriorityHero briefing={memberBriefing} large={large} />
      ) : memberFailed ? (
        <p className={`${CARD} text-base text-[var(--ink-muted)]`}>Today&rsquo;s priority could not be loaded. Try reloading the page.</p>
      ) : (
        <CardSkeleton className="h-[220px]" />
      )}

      <PinnedBoard />

      {fieldReady && (
        // The inbox column disappears when nobody is asking (the inbox renders nothing), and the field takes the row.
        <div className="flex flex-col gap-4 lg:flex-row">
          <Reveal className={`${CARD} relative min-w-0 flex-[7_1_0%] overflow-hidden !p-0`}>
            <div className="absolute left-6 right-6 top-5 z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconBadge icon={Orbit} tone="sand" />
                <h2 className="text-sm font-semibold text-[var(--ink-muted)]">Who carries the house this week</h2>
              </div>
              <Link
                href="/load"
                className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)]/80 px-3 py-1 text-sm text-[var(--ink)] backdrop-blur transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
              >
                Open Load <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <LoadFieldLazy
              bodies={bodies}
              flows={flows}
              highlightId={highlightId}
              onHighlight={setHighlightId}
              ariaLabel={fieldLabel}
              labels="hover"
              bodyScale={1.3}
              className="h-[380px] w-full lg:h-[440px]"
            />
          </Reveal>
          <div className="min-w-0 flex-[5_1_0%] empty:hidden">
            <HandoffInbox memberId={activeMemberId} onAccepted={(h) => triggerFlow(h.fromId, h.toId)} />
          </div>
        </div>
      )}

      <TimeBack briefing={currentBriefing} large={large} />

      <MicroActions actions={agentOutputs.connection?.microActions} />

      <AskBayt />
    </div>
  );
}
