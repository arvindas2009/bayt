import { addDays, format, startOfDay } from 'date-fns'
import prisma from '@/lib/db/prisma'
import { getSetting, setSetting } from '@/lib/db/queries'
import { daysBetween, getToday } from '@/lib/time/today'
import { buildCalendarEvents } from './mock-family'
import { SEED_ANCHOR_KEY, SEED_PREFIX } from './seed-constants'

/**
 * Keeps seeded demo data relative to "today".
 *
 * The seed stamps an anchor date. When the calendar day moves on, we:
 *  - rebuild seeded events around the new today (user-created events are left alone), then
 *    re-apply any accepted event handoffs so consent decisions survive the rollover
 *  - shift seeded obligation due dates and memory timestamps by the same number of days
 *    (owners are untouched, so accepted handoffs stay accepted)
 * Databases that were never seeded through `npm run seed` have no anchor and are left alone.
 */

let inflight: Promise<boolean> | null = null

export function ensureFreshSeed(): Promise<boolean> {
  // Concurrent requests share one refresh instead of racing each other.
  inflight ??= refresh().finally(() => {
    inflight = null
  })
  return inflight
}

async function refresh(): Promise<boolean> {
  const anchorValue = await getSetting(SEED_ANCHOR_KEY)
  if (!anchorValue) return false

  const today = startOfDay(getToday())
  const delta = daysBetween(new Date(`${anchorValue}T00:00:00`), today)
  if (delta === 0) return false

  const events = buildCalendarEvents(today)

  const acceptedEventHandoffs = await prisma.handoff.findMany({
    where: { itemType: 'event', status: 'accepted' },
    orderBy: { respondedAt: 'asc' },
  })
  const owners = new Map<string, string>()
  for (const h of acceptedEventHandoffs) owners.set(h.itemId, h.toId)

  const [obligations, memories, wearables] = await Promise.all([
    prisma.obligation.findMany({ where: { id: { startsWith: SEED_PREFIX.obligation } } }),
    prisma.memory.findMany({ where: { id: { startsWith: SEED_PREFIX.memory } } }),
    prisma.healthProfile.findMany(),
  ])

  await prisma.$transaction(async (tx) => {
    await tx.calendarEvent.deleteMany({ where: { id: { startsWith: SEED_PREFIX.event } } })
    await tx.calendarEvent.createMany({
      data: events.map((e) => ({
        id: e.id,
        memberId: e.memberId,
        title: e.title,
        date: new Date(e.date),
        category: e.category.toLowerCase(),
        conflict: e.conflict,
        metadata: e.metadata ? JSON.stringify(e.metadata) : null,
        ownerId: owners.get(e.id) ?? e.ownerId ?? null,
        backupIds: JSON.stringify(e.backupIds ?? []),
        recurrence: e.recurrence ?? null,
      })),
    })

    for (const o of obligations) {
      await tx.obligation.update({ where: { id: o.id }, data: { dueDate: addDays(o.dueDate, delta) } })
    }
    for (const m of memories) {
      await tx.memory.update({ where: { id: m.id }, data: { capturedAt: addDays(m.capturedAt, delta) } })
    }
    for (const w of wearables) {
      try {
        const data = JSON.parse(w.wearableData) as { lastSync?: string }
        if (data.lastSync) {
          data.lastSync = addDays(new Date(data.lastSync), delta).toISOString()
          await tx.healthProfile.update({ where: { id: w.id }, data: { wearableData: JSON.stringify(data) } })
        }
      } catch {
        // Unparseable wearable blob: leave it as it was.
      }
    }
  })

  await setSetting(SEED_ANCHOR_KEY, format(today, 'yyyy-MM-dd'))
  console.log(`[seed] Re-anchored demo data by ${delta} day(s) to ${format(today, 'yyyy-MM-dd')}`)
  return true
}
