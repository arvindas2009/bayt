import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { markDetectedConflicts } from '@/lib/ops/conflicts-db'
import { ConfirmBodySchema, EVENT_CATEGORIES, OBLIGATION_CATEGORIES } from '@/lib/ingest/types'
import { REFERENCE_DURATIONS } from '@/lib/load/reference-durations'

/**
 * POST `{ items }`: save what a person reviewed. Every field is validated again here, because the
 * client is not trusted: the owner must be a real member, the date a real date.
 */
export async function POST(req: NextRequest) {
  const parsed = ConfirmBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Nothing valid to save.' }, { status: 400 })

  const family = await prisma.family.findFirst({ include: { members: { select: { id: true } } } })
  if (!family) return NextResponse.json({ error: 'No family found.' }, { status: 404 })
  const memberIds = new Set(family.members.map((m) => m.id))

  // Check everything before saving anything, so a bad row never leaves the others half-saved.
  const dated = parsed.data.items.map((item) => ({ item, at: new Date(`${item.date}T${item.time ?? '09:00'}:00`) }))
  for (const { item, at } of dated) {
    if (!memberIds.has(item.ownerId)) return NextResponse.json({ error: 'Choose who this belongs to.' }, { status: 400 })
    if (Number.isNaN(at.getTime())) return NextResponse.json({ error: `"${item.title}" has no valid date.` }, { status: 400 })
  }

  const created: { obligations: number; events: number } = { obligations: 0, events: 0 }

  for (const { item, at } of dated) {
    const taskType = item.taskType in REFERENCE_DURATIONS ? item.taskType : 'generic'

    if (item.kind === 'obligation') {
      const category = OBLIGATION_CATEGORIES.find((c) => c === item.category) ?? 'Home'
      await prisma.obligation.create({
        data: {
          familyId: family.id,
          title: item.title,
          category,
          taskType,
          dueDate: at,
          ownerId: item.ownerId,
          backupIds: '[]',
          consequence: item.consequence?.trim() || 'The document does not say what happens if it is missed.',
          leadTimeDays: 7,
          status: 'open',
          sourceType: 'inbox',
        },
      })
      created.obligations++
    } else {
      const category = EVENT_CATEGORIES.find((c) => c === item.category.toLowerCase()) ?? 'family'
      await prisma.calendarEvent.create({
        data: {
          memberId: item.ownerId,
          title: item.title,
          date: at,
          category,
          conflict: false,
          ownerId: item.ownerId,
          backupIds: '[]',
        },
      })
      created.events++
    }
  }

  // A new event can clash with one already on the calendar.
  if (created.events > 0) await markDetectedConflicts(family.id)
  return NextResponse.json(created, { status: 201 })
}
