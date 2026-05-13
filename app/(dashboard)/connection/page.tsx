'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw } from 'lucide-react';
import { useAgentStore } from '@/store/agent-store';
import { useFamilyStore } from '@/store/family-store';
import type { ConnectionDriftAlert, ConnectionMicroAction, MemoryVaultEntry, RepairProtocol } from '@/types/agents';
import type { DriftAlert, MicroIntervention, ConnectionMemory } from '@/lib/data/mock-connection';
import RelationshipDriftAlerts from '@/components/connection/RelationshipDriftAlerts';
import MicroInterventionsTimeline from '@/components/connection/MicroInterventionsTimeline';
import MemoryVault from '@/components/connection/MemoryVault';
import RepairProtocolCard from '@/components/connection/RepairProtocolCard';

// ─── Transformers: new agent shape → component prop shape ─────────────────────

function toDriftAlert(a: ConnectionDriftAlert, i: number): DriftAlert {
  const days = a.daysSinceContact;
  return {
    id: `drift-${i}`,
    memberA: a.memberA,
    memberB: a.memberB,
    driftLabel: days >= 14 ? '2 weeks' : days >= 7 ? '1 week' : `${days} days`,
    driftDays: days,
    severity: a.severity === 'moderate' ? 'warning' : a.severity === 'minor' ? 'info' : 'critical',
    description: a.reason,
    suggestion: a.suggestion,
  };
}

function toMicroIntervention(a: ConnectionMicroAction, i: number): MicroIntervention {
  const validDays = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const day = validDays.has(a.day) ? (a.day as MicroIntervention['day']) : 'Mon';
  return {
    id: `mi-${i}`,
    day,
    action: a.description,
    relationship: a.membersInvolved.join(' & '),
    alertId: '',
    effort: a.type === 'quick' ? 'low' : a.type === 'invest' ? 'high' : 'medium',
  };
}

function toMemory(e: MemoryVaultEntry, i: number): ConnectionMemory {
  return {
    id: `mem-${i}`,
    quote: e.quote,
    fullText: e.quote,
    attribution: e.attribution,
    role: e.role,
    dateCaptured: e.date,
    tags: [],
  };
}

// ─── Agent status badge ───────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectionPage() {
  const { agentStatuses, agentOutputs, runAgent } = useAgentStore();
  const family = useFamilyStore((s) => s.family);
  const status = agentStatuses.connection;
  const agentData = agentOutputs.connection;

  const [activeProtocols, setActiveProtocols] = useState<RepairProtocol[]>(
    agentData.repairProtocols || []
  );

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const currentStatus = useAgentStore.getState().agentStatuses.connection;
      if (currentStatus === 'thinking') {
        return;
      }

      runAgent('connection');
    };

    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [runAgent]);

  useEffect(() => {
    if (agentData.repairProtocols) {
      setActiveProtocols(agentData.repairProtocols);
    }
  }, [agentData.repairProtocols]);

  const driftAlerts = agentData.driftAlerts.map(toDriftAlert);
  const microInterventions = agentData.microActions.map(toMicroIntervention);
  const memories = agentData.memoriesVault.map(toMemory);
  const criticalCount = driftAlerts.filter((a) => a.severity === 'critical').length;

  const handleGenerateRepair = async (alert: DriftAlert) => {
    if (!family) return;
    const memberAId = family.members.find(m => m.name === alert.memberA)?.id;
    const memberBId = family.members.find(m => m.name === alert.memberB)?.id;
    
    if (!memberAId || !memberBId) return;

    try {
      const res = await fetch('/api/agents/connection/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId: memberAId,
          toMemberId: memberBId,
          driftDays: alert.driftDays,
          driftCause: alert.description
        }),
      });
      if (res.ok) {
        const newProtocol: RepairProtocol = await res.json();
        setActiveProtocols(prev => [newProtocol, ...prev]);
      }
    } catch (e) {
      console.error('Failed to generate repair protocol:', e);
    }
  };

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <div className="flex items-center gap-3">
          <Users className="size-4 text-[var(--primary)]" />
          <span
            className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface)]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Connection
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status === 'live' && (
            <button
              onClick={() => runAgent('connection')}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            >
              <RefreshCw className="size-3" />
              Refresh
            </button>
          )}
          <AgentBadge status={status} />
        </div>
      </div>

      {status === 'thinking' && (
        <RunningBanner
          title="Connection trial data"
          description="Showing the last loaded Connection result while Bayt refreshes the trial data in the background."
        />
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-6 px-10 py-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
      >
        {[
          { label: 'Drift alerts',     value: `${driftAlerts.length}`,        color: 'var(--error)'    },
          { label: 'Critical',          value: `${criticalCount}`,              color: 'var(--error)'    },
          { label: 'Micro-actions',     value: `${microInterventions.length}`,  color: 'var(--primary)'  },
          { label: 'Memories captured', value: `${memories.length}`,            color: 'var(--tertiary)' },
          { label: 'Sync score',        value: `${agentData.syncScore}%`,       color: 'var(--primary)'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex shrink-0 flex-col gap-0.5">
            <span
              className="font-mono text-lg font-bold leading-none"
              style={{ color, fontFamily: 'var(--font-space-grotesk)' }}
            >
              {value}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              {label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 p-10 items-start">

        <motion.div
          className="col-span-12 lg:col-span-4 flex flex-col gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <RelationshipDriftAlerts alerts={driftAlerts} onGenerateRepair={handleGenerateRepair} />
        </motion.div>

        <motion.div
          className="col-span-12 lg:col-span-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
        >
          <MicroInterventionsTimeline interventions={microInterventions} />
        </motion.div>

        <motion.div
          className="col-span-12 lg:col-span-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: 'easeOut' }}
        >
          <MemoryVault memories={memories} />

          {/* ── Active Repair Protocols ────────────────────────────────────────── */}
          {activeProtocols.length > 0 && family && (
            <section className="mt-6 flex flex-col gap-0">
              <header className="mb-4 flex items-center justify-between px-1">
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
                  Active Repair Protocols
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5" style={{ background: 'var(--primary)' }} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    {activeProtocols.length} active
                  </span>
                </div>
              </header>
              <div className="flex flex-col gap-4">
                {activeProtocols.map((protocol) => (
                  <RepairProtocolCard key={protocol.id} protocol={protocol} members={family.members} />
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div className="px-10 pb-8 pt-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-30">
          {status === 'live'
            ? 'Live — powered by Connection Agent · Nemotron Nano 30B via NVIDIA'
            : 'Preview — powered by Connection Agent (in development)'}
        </p>
      </div>
    </div>
  );
}
