'use client';

import { useState } from 'react';
import {
  Pencil,
  Plus,
  Calendar,
  Heart,
  Activity,
  GraduationCap,
  MessageCircle,
  Watch,
  ShoppingCart,
  Trash2,
  X,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { getCulturalContext } from '@/lib/utils/cultural-context';
import { useFamilyStore } from '@/store/family-store';
import type { FamilyMember } from '@/types';
import MemberEditModal from '@/components/members/MemberEditModal';
import AddMemberModal from '@/components/members/AddMemberModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: 'connected';
  lastSync: string;
  iconColor: string;
}

interface PrivacySetting {
  id: string;
  label: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  { id: 'gcal',   name: 'Google Calendar',     icon: Calendar,       status: 'connected', lastSync: '2m ago',   iconColor: '#4285F4' },
  { id: 'ahealth',name: 'Apple Health',         icon: Heart,          status: 'connected', lastSync: '14m ago',  iconColor: '#fc3d58' },
  { id: 'gfit',   name: 'Google Fit',           icon: Activity,       status: 'connected', lastSync: '31m ago',  iconColor: '#34A853' },
  { id: 'adu',    name: 'ADU School Portal',    icon: GraduationCap,  status: 'connected', lastSync: '2h ago',   iconColor: '#cfbcff' },
  { id: 'wa',     name: 'WhatsApp (On-Device)', icon: MessageCircle,  status: 'connected', lastSync: '5m ago',   iconColor: '#25D366' },
  { id: 'garmin', name: 'Garmin',               icon: Watch,          status: 'connected', lastSync: '8m ago',   iconColor: '#007cc2' },
  { id: 'noon',   name: 'Noon Food',            icon: ShoppingCart,   status: 'connected', lastSync: '1d ago',   iconColor: '#e7c365' },
];

const PRIVACY_SETTINGS: PrivacySetting[] = [
  { id: 'wa_parsing',    label: 'WhatsApp parsing: On-device only' },
  { id: 'health_share',  label: 'Health data: Never shared externally' },
  { id: 'briefing_local', label: 'Briefing data: Local storage only' },
];

const ROLE_LABEL: Record<string, string> = {
  parent:      'Parent',
  child:       'Child',
  grandparent: 'Grandparent',
};

const AVATAR_COLORS: string[] = [
  'var(--primary-container)',
  'var(--secondary-container)',
  '#1e3a5f',
  '#1a3d2e',
  '#3d2b1a',
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center text-sm font-bold"
      style={{
        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
        color: 'var(--on-surface)',
        fontFamily: 'var(--font-space-grotesk)',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Toggle (Switch) ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex h-6 w-11 shrink-0 items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      style={{
        background: checked ? 'var(--primary-container)' : 'var(--surface-container-high)',
        border: `1px solid ${checked ? 'var(--primary)' : 'var(--outline-variant)'}`,
        borderRadius: 999,
      }}
    >
      <span
        className="pointer-events-none absolute h-4 w-4 transition-transform duration-200"
        style={{
          background: checked ? 'var(--primary)' : 'var(--on-surface-variant)',
          borderRadius: '50%',
          transform: checked ? 'translateX(24px)' : 'translateX(4px)',
        }}
      />
    </button>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.78)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md p-8 flex flex-col gap-6"
        style={{
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--error)',
          borderTop: '3px solid var(--error)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className="flex size-10 shrink-0 items-center justify-center"
            style={{ background: 'rgba(255,180,171,0.1)', border: '1px solid var(--error)' }}
          >
            <AlertTriangle className="size-5" style={{ color: 'var(--error)' }} />
          </div>
          <div>
            <p
              className="text-lg font-bold text-[var(--on-surface)]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Delete Family Profile
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              This action is permanent and cannot be undone
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
          All family data — members, health records, briefings, calendar history, caregiver logs, and connected source data — will be permanently erased. This cannot be recovered.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            style={{ border: '1px solid var(--outline-variant)' }}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{ background: 'var(--error)', color: 'var(--on-error)' }}
          >
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
      {children}
    </p>
  );
}

// ─── Member info pills ─────────────────────────────────────────────────────────

function MemberInfoPills({ member }: { member: FamilyMember }) {
  const pills: string[] = [];
  if (member.healthProfile?.conditions?.length) {
    pills.push(...member.healthProfile.conditions.slice(0, 2));
  }
  if (member.dietaryNeeds?.length) {
    pills.push(...member.dietaryNeeds.slice(0, 1));
  }
  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {pills.map((p) => (
        <span
          key={p}
          className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)', border: '1px solid var(--outline-variant)' }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { family } = useFamilyStore();
  const members = family?.members ?? [];

  const [privacy, setPrivacy] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_SETTINGS.map((s) => [s.id, true]))
  );
  const [showDeleteDialog, setShowDeleteDialog]   = useState(false);
  const [editingMember, setEditingMember]         = useState<FamilyMember | null>(null);
  const [showAddMember, setShowAddMember]         = useState(false);
  const [city, setCity]                           = useState('Abu Dhabi, UAE');
  const [culturalCalendarEnabled, setCulturalCalendarEnabled] = useState(true);

  const culturalCtx = getCulturalContext(new Date());

  const SEASON_LABELS: Record<string, string> = {
    ramadan:       'Ramadan',
    dust_season:   'Dust Season',
    summer_heat:   'Summer Heat',
    exam_period:   'Exam Period',
    school_holiday: 'School Holiday',
  };

  const CITY_OPTIONS = [
    'Abu Dhabi, UAE',
    'Dubai, UAE',
    'Sharjah, UAE',
    'Riyadh, KSA',
    'Jeddah, KSA',
    'Kuwait City, Kuwait',
    'Doha, Qatar',
    'Muscat, Oman',
  ];

  return (
    <>
      {/* ── Toolbar ── */}
      <div
        className="flex items-center justify-between px-10 py-3"
        style={{ borderBottom: '1px solid var(--outline-variant)' }}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--on-surface-variant)]">
          Family · {family?.name ?? 'Al-Salem Family'}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
          v1.0.4
        </span>
      </div>

      <div className="p-10 flex flex-col gap-10 max-w-[1440px]">
        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ═══ LEFT — Family Members ═══════════════════════════════════════ */}
          <section className="flex flex-col gap-4">
            <SectionLabel>Family Members</SectionLabel>

            <div className="flex flex-col gap-2">
              {members.map((member, i) => (
                <div
                  key={member.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                  }}
                >
                  <Avatar name={member.name} index={i} />

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold text-[var(--on-surface)] truncate"
                      style={{ fontFamily: 'var(--font-space-grotesk)' }}
                    >
                      {member.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                      {ROLE_LABEL[member.role] ?? member.role} · {member.age} yrs
                    </p>
                    <MemberInfoPills member={member} />
                  </div>

                  <button
                    aria-label={`Edit ${member.name}`}
                    onClick={() => setEditingMember(member)}
                    className="flex size-8 shrink-0 items-center justify-center text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)] mt-1"
                    style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-high)' }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              ))}

              {members.length === 0 && (
                <div
                  className="flex items-center justify-center py-8 text-sm text-[var(--on-surface-variant)]"
                  style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
                >
                  No family members yet.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 self-start px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
              style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
            >
              <Plus className="size-3.5" />
              Add Member
            </button>
          </section>

          {/* ═══ RIGHT — Connected Sources ═══════════════════════════════════ */}
          <section className="flex flex-col gap-6">

            <div className="flex flex-col gap-3">
              <SectionLabel>Connected Sources</SectionLabel>

              <div
                className="flex flex-col"
                style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
              >
                {INTEGRATIONS.map((src, i) => {
                  const Icon = src.icon;
                  return (
                    <div
                      key={src.id}
                      className="flex items-center gap-4 px-5 py-3.5"
                      style={i > 0 ? { borderTop: '1px solid var(--outline-variant)' } : {}}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center"
                        style={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}
                      >
                        <Icon className="size-4" style={{ color: src.iconColor }} />
                      </div>
                      <p
                        className="flex-1 text-sm text-[var(--on-surface)]"
                        style={{ fontFamily: 'var(--font-inter)' }}
                      >
                        {src.name}
                      </p>
                      <div className="flex items-center gap-1.5 mr-3">
                        <span className="size-1.5 rounded-full" style={{ background: '#86efac' }} />
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                          {src.lastSync}
                        </span>
                      </div>
                      <button className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] transition-colors hover:text-[var(--error)]">
                        Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SectionLabel>Privacy Settings</SectionLabel>

              <div
                className="flex flex-col"
                style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
              >
                {PRIVACY_SETTINGS.map((setting, i) => (
                  <div
                    key={setting.id}
                    className="flex items-center gap-4 px-5 py-4"
                    style={i > 0 ? { borderTop: '1px solid var(--outline-variant)' } : {}}
                  >
                    <p
                      className="flex-1 text-sm text-[var(--on-surface)]"
                      style={{ fontFamily: 'var(--font-inter)' }}
                    >
                      {setting.label}
                    </p>
                    <Toggle
                      checked={privacy[setting.id]}
                      onChange={(v) => setPrivacy((prev) => ({ ...prev, [setting.id]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SectionLabel>How We Handle Your Data</SectionLabel>

              <div className="grid grid-cols-1 gap-4">
                <div
                  className="p-5"
                  style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] mb-3">
                    Ownership, consent, and storage
                  </p>
                  <div className="space-y-2 text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
                    <p>
                      <span className="text-[var(--on-surface)]">The family owns the record.</span> Bayt keeps family profiles, notes, and briefings in local SQLite first, so the household data stays under your control.
                    </p>
                    <p>
                      <span className="text-[var(--on-surface)]">Consent is source-by-source.</span> You can disconnect any integration at any time, and deleting the family profile removes the local data.
                    </p>
                    <p>
                      <span className="text-[var(--on-surface)]">Only the minimum analysis context leaves the app.</span> When you ask for an agent response, Bayt sends just the prompt snapshot needed to produce that answer.
                    </p>
                  </div>
                </div>

                <div
                  className="p-5"
                  style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] mb-3">
                    AI limits, bias, and harm
                  </p>
                  <div className="space-y-2 text-sm leading-relaxed text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
                    <p>
                      <span className="text-[var(--on-surface)]">Risk labels are heuristics, not diagnoses.</span> A burnout flag is a workload warning, not a clinical judgment or moral verdict.
                    </p>
                    <p>
                      <span className="text-[var(--on-surface)]">If the AI is wrong, the UI should make that obvious.</span> We show source-backed indicators so a person can verify the recommendation before acting on it.
                    </p>
                    <p>
                      <span className="text-[var(--on-surface)]">Bias must stay auditable.</span> Visible inputs and transparent fallbacks make it easier to question a bad recommendation instead of trusting it blindly.
                    </p>
                  </div>
                </div>
              </div>

              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                Local-first SQLite is the privacy win: family data stays in Bayt, and the model only sees the slice needed for the requested analysis.
              </p>
            </div>

          </section>
        </div>

        {/* ═══ BOTTOM — Regional Settings ═════════════════════════════════════ */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Regional Settings</SectionLabel>

          <div
            className="grid grid-cols-1 gap-0 lg:grid-cols-2"
            style={{ border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)' }}
          >
            {/* Left — city + toggle */}
            <div
              className="flex flex-col gap-5 p-6"
              style={{ borderRight: '1px solid var(--outline-variant)' }}
            >
              {/* City selector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5" style={{ color: 'var(--on-surface-variant)' }} />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    City / Region
                  </p>
                </div>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="px-3 py-2.5 text-sm text-[var(--on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  style={{
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--outline-variant)',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-50">
                  Used for seasonal health alerts and calendar awareness
                </p>
              </div>

              {/* Cultural calendar toggle */}
              <div
                className="flex items-center justify-between gap-4 pt-4"
                style={{ borderTop: '1px solid var(--outline-variant)' }}
              >
                <div>
                  <p className="text-sm text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-inter)' }}>
                    Cultural calendar awareness
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                    Adjusts agents for Ramadan, Eid, dust season, exam periods
                  </p>
                </div>
                <Toggle checked={culturalCalendarEnabled} onChange={setCulturalCalendarEnabled} />
              </div>
            </div>

            {/* Right — active seasons (read-only) */}
            <div className="flex flex-col gap-3 p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                Active Seasons Today
              </p>

              {culturalCalendarEnabled ? (
                <>
                  {culturalCtx.activeSeasons.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {culturalCtx.activeSeasons.map((s) => (
                        <span
                          key={s}
                          className="px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
                          style={{
                            background: 'rgba(207,188,255,0.12)',
                            border: '1px solid rgba(207,188,255,0.3)',
                            color: 'var(--primary)',
                          }}
                        >
                          {SEASON_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
                      No active cultural seasons today.
                    </p>
                  )}

                  {culturalCtx.upcomingEvents.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant)] opacity-60">
                        Upcoming
                      </p>
                      {culturalCtx.upcomingEvents.map((e) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <span
                            className="size-1.5 rounded-full shrink-0"
                            style={{
                              background: e.impactLevel === 'high' ? '#fbbf24' : e.impactLevel === 'medium' ? 'var(--secondary)' : 'var(--on-surface-variant)',
                            }}
                          />
                          <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
                            {e.name} — in {e.daysUntil}d
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--on-surface-variant)]" style={{ fontFamily: 'var(--font-inter)' }}>
                  Cultural calendar awareness is disabled. Agents use standard outputs.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ═══ BOTTOM — Danger Zone ════════════════════════════════════════════ */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Danger Zone</SectionLabel>

          <div
            className="flex items-center justify-between px-6 py-5"
            style={{
              border: '1px solid var(--error)',
              background: 'rgba(255,180,171,0.04)',
            }}
          >
            <div>
              <p
                className="text-sm font-semibold text-[var(--on-surface)]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                Delete Family Profile
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
                Permanently erase all family data, members, and connected sources
              </p>
            </div>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors hover:bg-[rgba(255,180,171,0.12)]"
              style={{
                border: '1px solid var(--error)',
                color: 'var(--error)',
              }}
            >
              <Trash2 className="size-3.5" />
              Delete Family Profile
            </button>
          </div>
        </section>
      </div>

      {showDeleteDialog && <DeleteDialog onClose={() => setShowDeleteDialog(false)} />}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
        />
      )}
      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} />}
    </>
  );
}
