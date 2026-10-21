'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, Clock, Flame, PieChart, RefreshCw, Scale, ShieldAlert } from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';
import { useFamilyStore } from '@/store/family-store';
import { useFlows } from '@/lib/hooks/useFlows';
import { useLoadBodies } from '@/lib/hooks/useLoadBodies';
import { useMemberLookup } from '@/lib/hooks/useMemberLookup';
import { useResilience } from '@/lib/hooks/useResilience';
import { usePageBusy } from '@/lib/hooks/usePageBusy';
import { useViewingAs } from '@/lib/hooks/useViewingAs';
import { BURNOUT_THRESHOLD, WEEKLY_CAPACITY_HOURS } from '@/lib/load/reference-durations';
import type { SourceRef } from '@/types/agents';
import type { Handoff } from '@/types/family';
import HandoffInbox from '@/components/handoffs/HandoffInbox';
import ResilienceMode from '@/components/resilience/ResilienceMode';
import WhyPopover from '@/components/ui/WhyPopover';
import { CardSkeleton } from '@/components/ui/Skeleton';
import LoadFieldLazy from '@/components/visual/LoadFieldLazy';
import { Avatar, CARD, IconBadge } from '@/components/ui/Card';
import AnimatedBar from '@/components/motion/AnimatedBar';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import CountUp from '@/components/motion/CountUp';
import Highlight from '@/components/ui/Highlight';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/components/ui/Button';
import PageHeader from '@/components/layout/PageHeader';
import PinButton from '@/components/pins/PinButton';

export default function LoadPage() {
  const { agentStatuses, agentOutputs, agentMeta, runAgent } = useAgentStore();
  const family = useFamilyStore((s) => s.family);
  const { bodies, figures, ariaLabel, ready } = useLoadBodies();
  const { nameOf, colorOf } = useMemberLookup();
  const viewing = useViewingAs();
  const { flows, trigger } = useFlows();
  const r = useResilience();

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [days, setDays] = useState(14);
  const [sources, setSources] = useState<Record<string, SourceRef[]>>({});

  const status = agentStatuses.caregiver;
  const data = agentOutputs.caregiver;
  // Until someone is chosen, stress-test whoever carries the most (the story's obvious question).
  const topId = useMemo(() => [...figures].sort((a, b) => b.hours - a.hours)[0]?.memberId ?? null, [figures]);
  const absentId = picked ?? topId ?? viewing.id;

  useEffect(() => {
    // Served from today's stored run unless it is stale, so this never burns model quota.
    runAgent('caregiver');
  }, [runAgent]);

  // The records behind each person's number, for the "Why?" popovers. Refetched whenever the numbers move.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/load', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { sourcesByMember?: Record<string, SourceRef[]> } | null) => {
        if (!cancelled && body?.sourcesByMember) setSources(body.sourcesByMember);
      })
      .catch((err) => console.error('load sources:', err));
    return () => {
      cancelled = true;
    };
  }, [figures]);

  const runTest = useCallback(
    async (withPlan: boolean, who: string | null = absentId) => {
      if (!who) return;
      const out = withPlan ? await r.draftPlan(who, days) : await r.run(who, days);
      // Light travels from the absent person to everyone who would step in.
      if (out && !withPlan) for (const c of out.covered) trigger(out.absentId, c.coverId);
    },
    [absentId, days, r, trigger],
  );

  const onAccepted = useCallback(
    (h: Handoff) => {
      trigger(h.fromId, h.toId);
      if (r.sim) void r.run(r.sim.absentId, r.sim.days);
    },
    [r, trigger],
  );

  const { sim } = r;

  // While a stress test is on screen, bodies show what each present person would carry.
  const fieldBodies = useMemo(
    () =>
      bodies.map((b) => {
        const stressed = sim?.coverLoad.find((c) => c.memberId === b.id);
        return { ...b, detail: undefined, load: stressed ? Math.min(stressed.scoreAfter / 100, 1) : b.load };
      }),
    [bodies, sim],
  );
  const fieldLabel = sim
    ? `${ariaLabel} Stress test: ${nameOf(sim.absentId)} is away ${sim.days} days and ${sim.failures.length} ${
        sim.failures.length === 1 ? 'task has' : 'tasks have'
      } nobody to do them.`
    : ariaLabel;

  usePageBusy(!family || !ready);

  // Arriving from "Run a stress test" (/load#resilience): scroll there once the page has drawn.
  useEffect(() => {
    if (ready && family && window.location.hash === '#resilience') {
      document.getElementById('resilience')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [ready, family]);

  const stressTestWithout = (id: string) => {
    setPicked(id);
    void runTest(false, id);
    document.getElementById('resilience')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!family || !ready) {
    return (
      <div className="flex flex-col gap-6 p-10">
        <CardSkeleton className="h-[320px]" />
        <CardSkeleton className="h-[220px]" />
      </div>
    );
  }

  const ranked = [...figures].sort((a, b) => b.hours - a.hours);
  const atRisk = data?.atRiskMember;
  const anyOver = ranked.some((m) => m.score >= BURNOUT_THRESHOLD);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-10 pb-20 pt-8">
      <PageHeader
        shortTitle="Load"
        title="Who carries what"
        subtitle={
          <p className="text-sm text-[var(--ink-muted)]">
            The household&rsquo;s invisible work for the next <span className="num font-semibold text-[var(--ink)]">7 days</span>. Larger and hotter means more.
          </p>
        }
        actions={
          <>
            <button onClick={() => runAgent('caregiver', { force: true })} disabled={status === 'thinking'} className={BUTTON_SECONDARY}>
              <RefreshCw className={`size-3.5 ${status === 'thinking' ? 'animate-spin' : ''}`} aria-hidden />
              Recompute
            </button>
            <button
              onClick={() => document.getElementById('resilience')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={BUTTON_PRIMARY}
            >
              <ShieldAlert className="size-4" aria-hidden />
              Stress test
            </button>
          </>
        }
      />

      {status === 'preview' && agentMeta.caregiver?.error && (
        <p className="text-sm text-[var(--ink-muted)]">
          Numbers are computed from your data. The written summary is unavailable: {agentMeta.caregiver.error}
        </p>
      )}

      <div className="grid grid-cols-12 gap-4">
        <Reveal className={`${CARD} col-span-12 overflow-hidden !p-0 lg:col-span-7`}>
          <LoadFieldLazy
            bodies={fieldBodies}
            flows={flows}
            absentId={sim?.absentId ?? null}
            sparkIds={sim ? [...sim.inheritorIds, ...sim.affectedIds] : []}
            highlightId={highlightId}
            onHighlight={setHighlightId}
            onSelect={setPicked}
            ariaLabel={fieldLabel}
            labels="all"
            className="h-[380px] w-full lg:h-[460px]"
          />
        </Reveal>

        <Reveal delay={0.08} className={`${CARD} col-span-12 flex flex-col gap-4 lg:col-span-5`}>
          <div className="flex items-center gap-3">
            <IconBadge icon={Scale} tone="sand" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-[var(--ink)]">Load score out of 100</h2>
              <p className="text-xs text-[var(--ink-muted)]">The dashed mark is the burnout line, <span className="num">{BURNOUT_THRESHOLD}</span>.</p>
            </div>
            <PinButton id="load-scores" compact />
          </div>
          <Stagger as="ul" className="flex flex-col gap-2">
            {ranked.map((m, i) => {
              const over = m.score >= BURNOUT_THRESHOLD;
              // When someone is over the line, the others step back so the eye lands on them first.
              const dim = (highlightId && highlightId !== m.memberId) || (!highlightId && anyOver && !over);
              return (
                <StaggerItem
                  as="li"
                  key={m.memberId}
                  onPointerEnter={() => setHighlightId(m.memberId)}
                  onPointerLeave={() => setHighlightId(null)}
                  className={`rounded-2xl p-3 transition-colors duration-200 ${
                    over ? 'bg-[var(--ember-soft)] ring-1 ring-[var(--ember)]' : 'hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  {/* Opacity on an inner box: the item's own opacity is animated. */}
                  <div className="transition-opacity duration-200" style={{ opacity: dim ? 0.55 : 1 }}>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={nameOf(m.memberId)}
                        color={colorOf(m.memberId)}
                        size="md"
                        className={over ? 'ring-2 ring-[var(--ember)] ring-offset-2 ring-offset-[var(--surface)]' : ''}
                      />
                      <span className={`flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold ${over ? 'text-[var(--ember)]' : 'text-[var(--ink)]'}`}>
                        {nameOf(m.memberId)}
                        {over && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ember)] px-2 py-0.5 text-xs font-semibold text-[var(--on-ember)]">
                            <Flame className="size-3" aria-hidden />
                            Over the line, <span className="num">+{m.score - BURNOUT_THRESHOLD}</span>
                          </span>
                        )}
                        <WhyPopover sources={sources[m.memberId]} />
                      </span>
                      <span className="num text-sm text-[var(--ink-muted)]">{m.hours} h</span>
                      <span
                        className={`num w-16 text-right text-base font-semibold ${over ? 'text-[var(--ember)]' : 'text-[var(--ink)]'}`}
                        title={`Load score out of 100. ${BURNOUT_THRESHOLD} and above is the burnout line.`}
                      >
                        {m.score}/100
                      </span>
                    </div>
                    <AnimatedBar
                      value={m.score / 100}
                      color={over ? 'var(--ember)' : colorOf(m.memberId)}
                      tick={BURNOUT_THRESHOLD / 100}
                      tickLabel={`Burnout line ${BURNOUT_THRESHOLD}/100`}
                      className={`mt-2.5 ${over ? 'h-3' : 'h-2'}`}
                      delay={i * 0.06}
                    />
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>
      </div>

      {atRisk && (
        <Reveal
          as="section"
          aria-labelledby="at-risk-title"
          className={`${CARD} grid gap-6 !border-[var(--ember)] !bg-[color-mix(in_oklab,var(--ember)_14%,var(--surface))] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                name={nameOf(atRisk.memberId)}
                color={colorOf(atRisk.memberId)}
                size="xl"
                className="ring-4 ring-[var(--ember)] ring-offset-4 ring-offset-[var(--surface)]"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ember)] px-2.5 py-1 text-xs font-semibold text-[var(--on-ember)]">
                  <Flame className="size-3.5" aria-hidden />
                  Over the burnout line
                </span>
                <h2 id="at-risk-title" className="font-display mt-1.5 text-4xl text-[var(--ink)]">
                  {nameOf(atRisk.memberId)}
                </h2>
              </div>
            </div>
            <p className="text-base leading-relaxed text-[var(--ink)]">
              <Highlight text={atRisk.summary} />
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => stressTestWithout(atRisk.memberId)} disabled={r.busy !== null} className={BUTTON_PRIMARY}>
                <ShieldAlert className="size-4" aria-hidden />
                Stress-test without {nameOf(atRisk.memberId)}
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-2xl bg-[var(--ember)] p-4 text-[var(--on-ember)]">
              <dt className="flex items-center gap-1.5 text-xs font-semibold">
                <Flame className="size-3.5" aria-hidden />
                Load score
              </dt>
              <dd className="flex items-baseline gap-1">
                <CountUp value={atRisk.score} className="font-display text-6xl" />
                <span className="text-base font-semibold">/100</span>
              </dd>
              <dd className="text-xs font-semibold">
                <span className="num">+{atRisk.pointsAbove}</span> over the line at <span className="num">{atRisk.threshold}</span>
              </dd>
            </div>
            <StatTile icon={Clock} label="Hours this week" value={atRisk.hours} unit="h" note={`A full week is ${WEEKLY_CAPACITY_HOURS} h`} />
            <StatTile icon={PieChart} label="Share of the family's load" value={atRisk.shareOfLoad} unit="%" />
            <StatTile icon={CalendarOff} label="Days since a rest block" value={atRisk.daysWithoutRest} unit={atRisk.daysWithoutRest === 1 ? 'day' : 'days'} />
          </dl>
        </Reveal>
      )}

      <div className="empty:hidden">
        <HandoffInbox memberId={viewing.id} onAccepted={onAccepted} />
      </div>

      <ResilienceMode
        absentId={absentId}
        onAbsentChange={setPicked}
        days={days}
        onDaysChange={setDays}
        sim={sim}
        plan={r.plan}
        baseline={r.baseline}
        busy={r.busy}
        error={r.error}
        onRun={() => void runTest(false)}
        onDraftPlan={() => void runTest(true)}
      />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, unit, note }: { icon: typeof Clock; label: string; value: number; unit: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-[var(--surface)] p-4">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)]">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="flex items-baseline gap-1 text-[var(--ink)]">
        <CountUp value={value} className="font-display text-5xl" />
        <span className="text-base font-semibold">{unit}</span>
      </dd>
      {note && <dd className="text-xs text-[var(--ink-muted)]">{note}</dd>}
    </div>
  );
}
