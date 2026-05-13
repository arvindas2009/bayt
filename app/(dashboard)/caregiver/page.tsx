'use client';

import { useEffect, useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';
import { burnoutHistory } from '@/lib/data/mock-caregiver';
import { useAgentStore } from '@/store/agent-store';
import { useFamilyStore } from '@/store/family-store';
import { calculateInvisibleHours } from '@/lib/utils/invisible-hours';
import type { CaregiverIntervention, LoadMember, LoadBreakdownCategory } from '@/types/agents';
import type { AutoIntervention, LoadDistribution, LoadBreakdownRow } from '@/lib/data/mock-caregiver';
import LoadDistributionChart      from '@/components/caregiver/LoadDistributionChart';
import RiskSummaryCard            from '@/components/caregiver/RiskSummaryCard';
import LoadBreakdownTable         from '@/components/caregiver/LoadBreakdownTable';
import InvisibleHoursBreakdown   from '@/components/caregiver/InvisibleHoursBreakdown';

// ─── Transformers: new agent shape → component prop shape ─────────────────────

function toLoadDistribution(m: LoadMember): LoadDistribution {
  return { member: m.memberName, score: m.score };
}

function toAutoIntervention(item: CaregiverIntervention, idx: number): AutoIntervention {
  const categoryMap: Record<CaregiverIntervention['type'], AutoIntervention['category']> = {
    personal_time: 'time-block',
    logistical_load: 'task-shift',
    medical_coordination: 'notification',
  };
  const protectsMap: Record<CaregiverIntervention['type'], string> = {
    personal_time: 'Personal time',
    logistical_load: 'Logistical load',
    medical_coordination: 'Medical coordination',
  };
  return {
    id: `ai-${idx}`,
    action: item.description,
    appliedAt: new Date().toISOString(),
    protects: protectsMap[item.type],
    category: categoryMap[item.type],
  };
}

function toLoadBreakdownRow(c: LoadBreakdownCategory): LoadBreakdownRow {
  return {
    category: c.category,
    Salem:  c.scores['Salem']  ?? 0,
    Fatima: c.scores['Fatima'] ?? 0,
    Layla:  c.scores['Layla']  ?? 0,
    Khalid: c.scores['Khalid'] ?? 0,
    Aisha:  c.scores['Aisha']  ?? 0,
  };
}

// ─── Agent badge ──────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 60_000;

function AgentBadge({ status }: { status: string }) {
  if (status === 'thinking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
        <RefreshCw className="size-3 animate-spin text-primary" />
        <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">Running</span>
      </div>
    );
  }
  if (status === 'live') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1" style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
        <span className="inline-block size-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Live</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-2.5 py-1" style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
      <span className="inline-block size-1.5 animate-pulse" style={{ background: 'var(--tertiary)' }} />
      <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Preview</span>
    </div>
  );
}

function RunningBanner({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="mx-10 mt-4 overflow-hidden border"
      style={{
        borderColor: 'var(--outline-variant)',
        background: 'linear-gradient(135deg, rgba(207,188,255,0.18), rgba(231,195,101,0.08), rgba(255,255,255,0.02))',
        boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="grid gap-6 p-6 md:min-h-55 md:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)] md:p-8">
        <div className="flex flex-col justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center border border-primary bg-surface-container-high">
              <RefreshCw className="size-6 animate-spin text-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-primary">Running</p>
              <p className="mt-1 max-w-xl font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Trial data is still visible while Bayt refreshes the page in the background
              </p>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold uppercase leading-none tracking-[-0.04em] text-on-surface md:text-7xl" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant md:text-base" style={{ fontFamily: 'var(--font-inter)' }}>
              {description}
            </p>
          </div>
        </div>
        <div className="grid gap-3 self-end">
          <div className="p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--outline-variant)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Cached data</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              The previous load remains on screen so the judge can see the trial state.
            </p>
          </div>
          <div className="p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--outline-variant)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Background refresh</p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              This page re-runs the agent about every minute while it stays open.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Data source banner ───────────────────────────────────────────────────────

function DataSourceBanner({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-10 py-4"
      style={{ background: 'var(--surface-container-lowest)', borderBottom: '1px solid var(--outline-variant)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] mb-2">
            How this is computed
          </p>
          <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
            The caregiver risk score is computed by the{' '}
            <span className="text-[var(--on-surface)]">Caregiver Protection Agent</span>, which analyses three signals from the family data:
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {[
              { label: 'Calendar load',      desc: 'How many calendar events involve each member as primary organiser, driver, or attendee — measured from the family calendar.' },
              { label: 'Medical coordination', desc: 'Medication reminders, clinic runs, and health appointments weighted by the member who manages them.' },
              { label: 'Household tasks',    desc: 'Meal planning, school admin, and logistics tasks distributed across members based on patterns in the Operations agent output.' },
            ].map(({ label, desc }) => (
              <div key={label} className="p-3" style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] mb-1">{label}</p>
                <p className="text-xs leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors mt-0.5">
          <X className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AMBER = '#e7c365';
const ERROR = '#ffb4ab';

export default function CaregiverPage() {
  const { agentStatuses, agentOutputs, runAgent } = useAgentStore();
  const family = useFamilyStore((s) => s.family);
  const status = agentStatuses.caregiver;
  const agentData = agentOutputs.caregiver;
  const [showDataSource, setShowDataSource] = useState(false);

  const invisibleHoursReport = family ? calculateInvisibleHours(family) : null;

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const currentStatus = useAgentStore.getState().agentStatuses.caregiver;
      if (currentStatus === 'thinking') {
        return;
      }

      runAgent('caregiver');
    };

    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [runAgent]);

  // Transform agent output to component prop shapes
  const loadDistribution = agentData.loadDistribution.map(toLoadDistribution);
  const autoInterventions = agentData.autoInterventions.map(toAutoIntervention);
  const loadBreakdown = agentData.loadBreakdownByCategory.map(toLoadBreakdownRow);
  const atRisk = agentData.atRiskMember;

  const riskScore = atRisk?.score ?? 0;
  const threshold = atRisk?.threshold ?? 75;
  const pointsAbove = atRisk?.pointsAbove ?? 0;
  const daysWithoutRest = atRisk?.daysWithoutRest ?? 0;
  const memberName = atRisk?.name ?? '';

  const isCritical = riskScore >= 80;
  const accentColor = isCritical ? ERROR : AMBER;

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div className="flex items-center gap-3">
          <Shield className="size-4" style={{ color: accentColor }} />
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            Caregiver Protection
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status === 'live' && (
            <button
              onClick={() => runAgent('caregiver')}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            >
              <RefreshCw className="size-2.5" />
              Refresh
            </button>
          )}
          <div className="h-6 w-px shrink-0" style={{ background: 'var(--outline-variant)' }} />
          <button
            onClick={() => setShowDataSource((v) => !v)}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors hover:text-[var(--on-surface)]"
            style={{ color: showDataSource ? 'var(--primary)' : 'var(--on-surface-variant)' }}
          >
            <Info className="size-2.5" />
            How this works
          </button>
          <AgentBadge status={status} />
        </div>
      </div>

      {status === 'thinking' && (
        <RunningBanner
          title="Caregiver trial data"
          description="Showing the last loaded Caregiver result while Bayt refreshes the trial data in the background."
        />
      )}

      {/* ── Data source panel ────────────────────────────────────────────────── */}
      {showDataSource && <DataSourceBanner onClose={() => setShowDataSource(false)} />}

      {/* ── Critical alert banner (only if someone is at-risk) ───────────────── */}
      {atRisk && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-10 py-3"
          style={{
            background: isCritical ? 'rgba(255,180,171,0.07)' : 'rgba(231,195,101,0.07)',
            borderBottom: `1px solid ${accentColor}`,
          }}
        >
          <AlertTriangle className="size-3.5 shrink-0" style={{ color: accentColor }} />
          <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: accentColor }}>
            {memberName} is carrying {riskScore}% of household load — {pointsAbove} points above the burnout threshold.
            Bayt has auto-applied {autoInterventions.length} protective interventions.
          </p>
        </motion.div>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-10 py-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        {[
          { label: 'Risk score',         value: `${riskScore}`,          color: accentColor },
          { label: 'Burnout threshold',  value: `${threshold}`,           color: AMBER },
          { label: 'Points above limit', value: `+${pointsAbove}`,        color: accentColor },
          { label: 'Auto-interventions', value: `${autoInterventions.length}`, color: 'var(--primary)' },
          { label: 'Days without rest',  value: `${daysWithoutRest}`,     color: accentColor },
        ].map(({ label, value, color }, i, arr) => (
          <Fragment key={label}>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="font-bold leading-none" style={{ color, fontFamily: 'var(--font-space-grotesk)', fontSize: 20 }}>
                {value}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                {label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className="h-6 w-px shrink-0" style={{ background: 'var(--outline-variant)' }} />
            )}
          </Fragment>
        ))}
        <div className="h-6 w-px shrink-0" style={{ background: 'var(--outline-variant)' }} />
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">Data from</span>
          {['Calendar', 'Health', 'Meal Plan'].map((src) => (
            <span key={src} className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: '1px solid var(--outline-variant)' }}>
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-10">
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 lg:col-span-7">
            <LoadDistributionChart data={loadDistribution} threshold={threshold} />
          </div>
          <div className="col-span-12 lg:col-span-5">
            {atRisk ? (
              <RiskSummaryCard
                member={memberName}
                score={riskScore}
                threshold={threshold}
                interventions={autoInterventions}
                history={burnoutHistory}
              />
            ) : (
              <div className="flex items-center justify-center p-12" style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                  No caregiver above burnout threshold
                </p>
              </div>
            )}
          </div>
        </div>
        <LoadBreakdownTable rows={loadBreakdown} />
        {invisibleHoursReport && family && (
          <InvisibleHoursBreakdown report={invisibleHoursReport} members={family.members} />
        )}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="px-10 pb-8 pt-0">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-30">
          {status === 'live'
            ? 'Live — powered by Caregiver Protection Agent · Nemotron Nano 30B via NVIDIA'
            : 'Preview — powered by Caregiver Protection Agent (in development) · Data sourced from family calendar, health profiles, and meal plan'}
        </p>
      </div>
    </div>
  );
}
