import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { markDetectedConflicts } from '@/lib/ops/conflicts-db'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { memberId, title, date, category } = body as {
    memberId: string
    title: string
    date: string
    category: string
  }

  if (!memberId || !title || !date || !category) {
    return NextResponse.json({ error: 'Missing required fields: memberId, title, date, category' }, { status: 400 })
  }

  const event = await prisma.calendarEvent.create({
    data: {
      memberId,
      title,
      date: new Date(date),
      category: String(category).toLowerCase(),
      conflict: false,
    },
  })

  // Flag any clash this event creates (it may also flag the event it clashes with).
  const member = await prisma.familyMember.findUnique({ where: { id: memberId }, select: { familyId: true } })
  if (member) await markDetectedConflicts(member.familyId)
  const saved = await prisma.calendarEvent.findUnique({ where: { id: event.id } })

  return NextResponse.json({
    id: event.id,
    memberId: event.memberId,
    title: event.title,
    date: event.date.toISOString(),
    category: event.category,
    conflict: saved?.conflict ?? event.conflict,
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
