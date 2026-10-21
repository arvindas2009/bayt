import { subDays } from 'date-fns'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db/prisma'
import { getHandoffs } from '@/lib/db/queries'
import { getToday } from '@/lib/time/today'
import type { HandoffProposal } from '@/types/agents'
import type { Handoff } from '@/types/family'

/**
 * Handoffs are the consent mechanism: Bayt may PROPOSE moving a task, but ownership only changes
 * when the recipient accepts. Accepting rewrites the owner (and keeps the previous owner as a
 * backup); declining or redirecting changes nothing about who owns the task.
 */

/** Do not re-propose an item that was declined this recently. */
const COOL_OFF_DAYS = 3

/** Turn proposals into pending handoffs, skipping duplicates. Returns how many were created. */
export async function createPendingHandoffs(familyId: string, proposals: HandoffProposal[]): Promise<number> {
  if (proposals.length === 0) return 0
  const existing = await getHandoffs(familyId)
  const cutoff = subDays(getToday(), COOL_OFF_DAYS)
  let created = 0

  for (const p of proposals) {
    const blocked = existing.some(
      (h) =>
        h.itemId === p.itemId &&
        (h.status === 'pending' || (h.status === 'declined' && new Date(h.respondedAt ?? h.createdAt) > cutoff)),
    )
    if (blocked) continue

    await prisma.handoff.create({
      data: {
        familyId,
        fromId: p.fromId,
        toId: p.toId,
        itemType: p.itemType,
        itemId: p.itemId,
        itemTitle: p.itemTitle,
        reason: p.reason,
      },
    })
    created++
  }
  return created
}

export type HandoffAction = 'accept' | 'decline' | 'redirect'

export interface RespondResult {
  ok: boolean
  error?: string
  handoff?: Handoff
}

const parseIds = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Previous owner becomes a backup; the new owner can no longer be their own backup. */
const withBackup = (raw: string, previousOwner: string, newOwner: string) =>
  JSON.stringify([...new Set([...parseIds(raw), previousOwner])].filter((id) => id !== newOwner))

export async function respondToHandoff(
  handoffId: string,
  action: HandoffAction,
  options: { redirectToId?: string } = {},
): Promise<RespondResult> {
  const h = await prisma.handoff.findUnique({ where: { id: handoffId } })
  if (!h) return { ok: false, error: 'Handoff not found' }
  if (h.status !== 'pending') return { ok: false, error: `Handoff already ${h.status}` }

  const now = getToday()

  if (action === 'decline') {
    await prisma.handoff.update({ where: { id: h.id }, data: { status: 'declined', respondedAt: now } })
    return { ok: true }
  }

  if (action === 'redirect') {
    const target = options.redirectToId
    if (!target || target === h.toId || target === h.fromId) return { ok: false, error: 'Choose someone else to suggest' }
    const member = await prisma.familyMember.findUnique({ where: { id: target } })
    if (!member) return { ok: false, error: 'Unknown member' }
    await prisma.$transaction([
      prisma.handoff.update({ where: { id: h.id }, data: { status: 'redirected', redirectedToId: target, respondedAt: now } }),
      // The suggestion becomes a fresh request that the new person must also accept.
      prisma.handoff.create({
        data: {
          familyId: h.familyId,
          fromId: h.fromId,
          toId: target,
          itemType: h.itemType,
          itemId: h.itemId,
          itemTitle: h.itemTitle,
          reason: `Redirected from another family member: ${h.reason}`,
        },
      }),
    ])
    return { ok: true }
  }

  // accept: change the owner, keep the previous owner as a backup so the task has two people.
  const updates: Prisma.PrismaPromise<unknown>[] = [
    prisma.handoff.update({ where: { id: h.id }, data: { status: 'accepted', respondedAt: now } }),
  ]
  if (h.itemType === 'obligation') {
    const row = await prisma.obligation.findUnique({ where: { id: h.itemId } })
    if (!row) return { ok: false, error: 'Task no longer exists' }
    updates.push(
      prisma.obligation.update({ where: { id: row.id }, data: { ownerId: h.toId, backupIds: withBackup(row.backupIds, h.fromId, h.toId) } }),
    )
  } else if (h.itemType === 'medication') {
    const row = await prisma.medication.findUnique({ where: { id: h.itemId } })
    if (!row) return { ok: false, error: 'Task no longer exists' }
    updates.push(
      prisma.medication.update({ where: { id: row.id }, data: { ownerId: h.toId, backupIds: withBackup(row.backupIds, h.fromId, h.toId) } }),
    )
  } else {
    const row = await prisma.calendarEvent.findUnique({ where: { id: h.itemId } })
    if (!row) return { ok: false, error: 'Task no longer exists' }
    updates.push(
      prisma.calendarEvent.update({ where: { id: row.id }, data: { ownerId: h.toId, backupIds: withBackup(row.backupIds, h.fromId, h.toId) } }),
    )
  }
  await prisma.$transaction(updates)
  return { ok: true }
}
