import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { isDemoMode } from '@/lib/demo/mode'
import { answerQuestion } from '@/lib/chat/answer'
import type { DividendFacts } from '@/lib/chat/facts'
import { getToday } from '@/lib/time/today'
import type { BriefingData } from '@/types/agents'

const BodySchema = z.object({
  question: z.string().trim().min(1).max(500),
  viewerId: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1000) }))
    .max(8)
    .default([]),
})

/**
 * POST /api/chat  { question, viewerId, history }
 * "Ask Bayt": answers a question from today's fact sheet. Reads only; nothing is stored. When no
 * model answers, the matching facts come back instead, so this is never a 500 for a model failure.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ask a question of up to 500 characters' }, { status: 400 })
  const { question, viewerId, history } = parsed.data

  try {
    await ensureFreshSeed()
    const family = await getFamilyWithEverything()
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    if (!family.members.some((m) => m.id === viewerId)) {
      return NextResponse.json({ error: 'Choose who is asking' }, { status: 400 })
    }

    const row = await prisma.briefing.findFirst({ where: { familyId: family.id }, orderBy: { date: 'desc' } })
    const stored = row ? (JSON.parse(row.opsOutput) as Partial<BriefingData>) : null
    const dividend: DividendFacts | null = row ? { hours: row.timeSaved, lines: stored?.dividendLines ?? [] } : null

    const answer = await answerQuestion({
      family,
      now: getToday(),
      viewerId,
      question,
      history,
      dividend,
      offline: isDemoMode,
    })
    return NextResponse.json(answer)
  } catch (error) {
    console.error('[POST /api/chat]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Chat failed' }, { status: 500 })
  }
}
