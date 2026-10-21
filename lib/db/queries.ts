import prisma from './prisma';
import { Prisma } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import type {
  Family,
  FamilyMember,
  HealthProfile,
  Medication,
  CalendarEvent,
  LabResult,
  WearableData,
  MemberPreferences,
  Obligation,
  ObligationCategory,
  Handoff,
  HandoffItemType,
  HandoffStatus,
  Recurrence,
} from '@/types';
import { getToday } from '@/lib/time/today';

const parseIdList = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

// ─── Row → domain type transformers ──────────────────────────────────────────

function parseHealthProfile(
  row: {
    id: string;
    memberId: string;
    conditions: string;
    lastLabResults: string;
    wearableData: string;
    riskFlags: string;
  }
): HealthProfile {
  return {
    memberId: row.memberId,
    conditions: JSON.parse(row.conditions) as string[],
    lastLabResults: JSON.parse(row.lastLabResults) as LabResult[],
    wearableData: JSON.parse(row.wearableData) as WearableData,
    riskFlags: JSON.parse(row.riskFlags) as string[],
  };
}

function parseMedication(row: {
  id: string;
  memberId: string;
  name: string;
  dosage: string;
  frequency: string;
  interactions: string;
  ownerId: string | null;
  backupIds: string;
}): Medication {
  return {
    id: row.id,
    memberId: row.memberId,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    interactions: JSON.parse(row.interactions) as string[],
    ownerId: row.ownerId ?? row.memberId,
    backupIds: parseIdList(row.backupIds),
  };
}

function parseCalendarEvent(row: {
  id: string;
  memberId: string;
  title: string;
  date: Date;
  category: string;
  conflict: boolean;
  metadata: string | null;
  ownerId: string | null;
  backupIds: string;
  recurrence: string | null;
}): CalendarEvent {
  return {
    id: row.id,
    memberId: row.memberId,
    title: row.title,
    date: row.date.toISOString(),
    // Normalised here so every consumer can rely on the lowercase EventCategory vocabulary.
    category: row.category.toLowerCase(),
    conflict: row.conflict,
    metadata: row.metadata != null ? (JSON.parse(row.metadata) as string) : undefined,
    ownerId: row.ownerId ?? undefined,
    backupIds: parseIdList(row.backupIds),
    recurrence: (row.recurrence as Recurrence | null) ?? undefined,
  };
}

function parseObligation(row: {
  id: string;
  familyId: string;
  title: string;
  category: string;
  taskType: string;
  dueDate: Date;
  recurrence: string | null;
  ownerId: string;
  backupIds: string;
  subjectId: string | null;
  consequence: string;
  leadTimeDays: number;
  status: string;
  sourceType: string | null;
  sourceId: string | null;
}): Obligation {
  return {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    category: row.category as ObligationCategory,
    taskType: row.taskType,
    dueDate: row.dueDate.toISOString(),
    recurrence: (row.recurrence as Recurrence | null) ?? undefined,
    ownerId: row.ownerId,
    backupIds: parseIdList(row.backupIds),
    subjectId: row.subjectId ?? undefined,
    consequence: row.consequence,
    leadTimeDays: row.leadTimeDays,
    status: row.status === 'done' ? 'done' : 'open',
    sourceType: row.sourceType ?? undefined,
    sourceId: row.sourceId ?? undefined,
  };
}

function parseHandoff(row: {
  id: string;
  familyId: string;
  fromId: string;
  toId: string;
  itemType: string;
  itemId: string;
  itemTitle: string;
  reason: string;
  status: string;
  redirectedToId: string | null;
  createdAt: Date;
  respondedAt: Date | null;
}): Handoff {
  return {
    id: row.id,
    familyId: row.familyId,
    fromId: row.fromId,
    toId: row.toId,
    itemType: row.itemType as HandoffItemType,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    reason: row.reason,
    status: row.status as HandoffStatus,
    redirectedToId: row.redirectedToId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString(),
  };
}

// ─── Include shape (reused across queries) ───────────────────────────────────

const memberInclude = {
  healthProfile: true,
  medications: true,
  calendarEvents: {
    orderBy: { date: 'asc' as const },
  },
} as const;

type MemberRow = Prisma.FamilyMemberGetPayload<{ include: typeof memberInclude }>;

function parseMember(row: MemberRow): FamilyMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role as FamilyMember['role'],
    age: row.age,
    avatarSeed: row.avatarSeed,
    dietaryNeeds: JSON.parse(row.dietaryNeeds) as string[],
    preferences: row.preferences ? (JSON.parse(row.preferences) as MemberPreferences) : undefined,
    healthProfile: row.healthProfile ? parseHealthProfile(row.healthProfile) : undefined,
    medications: row.medications.map(parseMedication),
    calendarEvents: row.calendarEvents.map(parseCalendarEvent),
  };
}

// ─── Query functions ──────────────────────────────────────────────────────────

/**
 * Returns the full family with every nested relation.
 * If familyId is omitted, returns the first family in the DB.
 */
export async function getFamilyWithEverything(familyId?: string): Promise<Family | null> {
  const raw = familyId
    ? await prisma.family.findUnique({
        where: { id: familyId },
        include: { members: { include: memberInclude } },
      })
    : await prisma.family.findFirst({
        include: { members: { include: memberInclude } },
      });

  if (!raw) return null;

  const [obligations, handoffs] = await Promise.all([
    prisma.obligation.findMany({ where: { familyId: raw.id }, orderBy: { dueDate: 'asc' } }),
    prisma.handoff.findMany({ where: { familyId: raw.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);

  return {
    id: raw.id,
    name: raw.name,
    members: raw.members.map((m) => parseMember(m)),
    obligations: obligations.map(parseObligation),
    handoffs: handoffs.map(parseHandoff),
  };
}

/**
 * Returns a single member with all relations.
 */
export async function getFamilyMember(memberId: string): Promise<FamilyMember | null> {
  const raw = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: memberInclude,
  });

  if (!raw) return null;
  return parseMember(raw);
}

/**
 * Calendar events for a family from `pastDays` ago to `futureDays` ahead of today.
 * Joins through members so a single familyId filters all members' events.
 */
export async function getRecentCalendarEvents(
  familyId: string,
  window: { pastDays?: number; futureDays?: number } = {},
): Promise<CalendarEvent[]> {
  const { pastDays = 7, futureDays = 14 } = window;
  const today = startOfDay(getToday());

  const rows = await prisma.calendarEvent.findMany({
    where: {
      member: { familyId },
      date: { gte: addDays(today, -pastDays), lt: addDays(today, futureDays + 1) },
    },
    orderBy: { date: 'asc' },
  });

  return rows.map(parseCalendarEvent);
}

export async function getObligations(familyId: string): Promise<Obligation[]> {
  const rows = await prisma.obligation.findMany({ where: { familyId }, orderBy: { dueDate: 'asc' } });
  return rows.map(parseObligation);
}

export async function getHandoffs(familyId: string, status?: HandoffStatus): Promise<Handoff[]> {
  const rows = await prisma.handoff.findMany({
    where: { familyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map(parseHandoff);
}

export interface StoredMemory {
  id: string;
  quote: string;
  attribution: string;
  role: string;
  source: 'captured' | 'sample';
  capturedAt: string;
}

export async function getMemories(familyId: string): Promise<StoredMemory[]> {
  const rows = await prisma.memory.findMany({ where: { familyId }, orderBy: { capturedAt: 'desc' } });
  return rows.map((r) => ({
    id: r.id,
    quote: r.quote,
    attribution: r.attribution,
    role: r.role,
    source: r.source === 'sample' ? 'sample' : 'captured',
    capturedAt: r.capturedAt.toISOString(),
  }));
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
