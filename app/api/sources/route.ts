import { NextRequest, NextResponse } from 'next/server'
import { resolveSources } from '@/lib/evidence/resolve'
import type { SourceRef } from '@/types/agents'

const TYPES = new Set(['event', 'medication', 'obligation', 'handoff'])

/** POST /api/sources  { sources: SourceRef[] } -> the records that exist, with readable titles. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { sources?: unknown }
  if (!Array.isArray(body.sources)) {
    return NextResponse.json({ error: 'sources must be an array' }, { status: 400 })
  }
  const refs = body.sources.filter(
    (s): s is SourceRef =>
      typeof s === 'object' && s !== null && TYPES.has((s as SourceRef).type) && typeof (s as SourceRef).id === 'string',
  )
  return NextResponse.json(await resolveSources(refs))
}
