import prisma from '@/lib/db/prisma'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { getToday } from '@/lib/time/today'
import { detectConflicts } from './conflicts'

/**
 * Persist `conflict: true` on events that the detector finds clashing, so the agenda shows the
 * badge for conflicts nobody flagged by hand (for example, an event a user just added).
 * Only ever sets the flag: a clash the family flagged stays flagged.
 */
export async function markDetectedConflicts(familyId: string): Promise<number> {
  const family = await getFamilyWithEverything(familyId)
  if (!family) return 0

  const ids = new Set(detectConflicts(family, getToday(), 21).flatMap((c) => c.events.map((e) => e.id)))
  const toMark = family.members.flatMap((m) => m.calendarEvents).filter((e) => ids.has(e.id) && !e.conflict)
  if (toMark.length === 0) return 0

  await prisma.calendarEvent.updateMany({ where: { id: { in: toMark.map((e) => e.id) } }, data: { conflict: true } })
  return toMark.length
}
