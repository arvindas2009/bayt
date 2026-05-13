import prisma from './prisma';
import { Prisma } from '@prisma/client';
import type {
  Family,
  FamilyMember,
  HealthProfile,
  Medication,
  CalendarEvent,
  LabResult,
  WearableData,
  MemberPreferences,
} from '@/types';

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
}): Medication {
  return {
    id: row.id,
    memberId: row.memberId,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    interactions: JSON.parse(row.interactions) as string[],
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
}): CalendarEvent {
  return {
    id: row.id,
    memberId: row.memberId,
    title: row.title,
    date: row.date.toISOString(),
    category: row.category,
    conflict: row.conflict,
    metadata: row.metadata != null ? (JSON.parse(row.metadata) as string) : undefined,
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

  return {
    id: raw.id,
    name: raw.name,
    members: raw.members.map((m) => parseMember(m)),
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
 * Returns calendar events for a family in a ±days window around today.
 * Joins through members so a single familyId filters all members' events.
 */
export async function getRecentCalendarEvents(
  familyId: string,
  days = 14
): Promise<CalendarEvent[]> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  const to = new Date(now);
  to.setDate(to.getDate() + days);

  const rows = await prisma.calendarEvent.findMany({
    where: {
      member: { familyId },
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  });

  return rows.map(parseCalendarEvent);
}
