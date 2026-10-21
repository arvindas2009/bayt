import { NextRequest, NextResponse } from 'next/server'
import { ensureFreshSeed } from '@/lib/data/refresh'
import { isDemoMode } from '@/lib/demo/mode'
import { getFamilyWithEverything } from '@/lib/db/queries'
import { serveAgent, type AgentResult, type ServedAgentOutput } from './runs'
import type { Family } from '@/types'
import type { AgentName } from '@/types/agents'

/**
 * Shared POST handler for /api/agents/*.
 *
 * Body: { familyId?: string, force?: boolean }. Without `force`, a same-day run is served from
 * the database, so opening a page never burns model quota. Agents never throw for expected
 * failures (they return a fallback result), so a 500 here means a genuine bug or a database problem
 * and is reported as one, never disguised as sample data.
 */
export async function handleAgentPost<T extends object>(
  req: NextRequest,
  agent: AgentName,
  run: (family: Family, offline: boolean) => Promise<AgentResult<T>>,
  after?: (family: Family, served: ServedAgentOutput<T>) => Promise<void>,
): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => ({}))) as { familyId?: string; force?: boolean }

    await ensureFreshSeed()
    const family = await getFamilyWithEverything(body.familyId)
    if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

    const served = await serveAgent({
      familyId: family.id,
      agent,
      force: body.force === true,
      run: () => run(family, isDemoMode),
    })
    if (after) await after(family, served)

    return NextResponse.json(served)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[/api/agents/${agent}]`, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
