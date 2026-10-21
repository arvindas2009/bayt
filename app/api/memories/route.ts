import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getFamilyWithEverything, getMemories } from '@/lib/db/queries'
import { getToday } from '@/lib/time/today'

const MIN_LENGTH = 3
const MAX_LENGTH = 280

const ROLE_LABEL: Record<string, string> = {
  parent: 'Parent',
  child: 'Child',
  grandparent: 'Grandparent',
}

/** GET /api/memories : the family's Memory Vault, newest first. */
export async function GET() {
  const family = await getFamilyWithEverything()
  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  return NextResponse.json(await getMemories(family.id))
}

/**
 * POST /api/memories  { quote, memberId }
 * The Memory Vault holds only what a person typed in: the model never writes or edits a quote.
 * `memberId` is whoever said it; the attribution is stored as their id and resolved at display time.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { quote?: unknown; memberId?: unknown }
  const quote = typeof body.quote === 'string' ? body.quote.trim().replace(/\s+/g, ' ') : ''
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''

  if (quote.length < MIN_LENGTH) return NextResponse.json({ error: 'Write the memory first' }, { status: 400 })
  if (quote.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Keep it under ${MAX_LENGTH} characters` }, { status: 400 })
  }

  const family = await getFamilyWithEverything()
  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
  const member = family.members.find((m) => m.id === memberId)
  if (!member) return NextResponse.json({ error: 'Choose who said it' }, { status: 400 })

  const row = await prisma.memory.create({
    data: {
      familyId: family.id,
      quote,
      attribution: member.id,
      role: ROLE_LABEL[member.role] ?? 'Family',
      source: 'captured',
      capturedAt: getToday(),
    },
  })
  return NextResponse.json(
    { id: row.id, quote: row.quote, attribution: row.attribution, role: row.role, source: 'captured', capturedAt: row.capturedAt.toISOString() },
    { status: 201 },
  )
}
