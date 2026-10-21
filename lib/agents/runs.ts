import prisma from '@/lib/db/prisma'
import { isSameDay } from 'date-fns'
import { getToday } from '@/lib/time/today'
import type { AgentName, AgentResponseMeta } from '@/types/agents'

/**
 * Every agent result is stored as an AgentRun. Pages read the latest run instead of re-running
 * a model on each visit, and `isFallback` is the single truthful source for the "Preview" state:
 * it is true only when the AI part of the result was unavailable and a built-in plan was used.
 */

export interface AgentResult<T> {
  output: T
  /** True when an LLM-dependent part fell back to built-in content. */
  isFallback: boolean
  error?: string
}

export type ServedAgentOutput<T> = T & AgentResponseMeta & { _generatedAt: string }

/** A cached run is reused for the rest of the same calendar day, up to this many hours. */
const MAX_AGE_HOURS = 12

export async function recordRun<T>(
  familyId: string,
  agent: AgentName,
  output: T,
  isFallback: boolean,
  error?: string,
): Promise<string> {
  const row = await prisma.agentRun.create({
    data: { familyId, agent, output: JSON.stringify(output), isFallback, error: error ?? null },
  })
  return row.createdAt.toISOString()
}

export async function getLatestRun<T>(
  familyId: string,
  agent: AgentName,
): Promise<{ output: T; isFallback: boolean; error?: string; createdAt: Date } | null> {
  const row = await prisma.agentRun.findFirst({ where: { familyId, agent }, orderBy: { createdAt: 'desc' } })
  if (!row) return null
  try {
    return { output: JSON.parse(row.output) as T, isFallback: row.isFallback, error: row.error ?? undefined, createdAt: row.createdAt }
  } catch {
    return null
  }
}

function isFresh(createdAt: Date, now: Date): boolean {
  return isSameDay(createdAt, now) && now.getTime() - createdAt.getTime() < MAX_AGE_HOURS * 3_600_000
}

function serve<T extends object>(
  output: T,
  isFallback: boolean,
  error: string | undefined,
  generatedAt: string,
): ServedAgentOutput<T> {
  return {
    ...output,
    ...(isFallback ? { _mock: true, _error: error } : {}),
    _generatedAt: generatedAt,
  } as ServedAgentOutput<T>
}

/**
 * Serve the cached run when it is fresh, otherwise run the agent, record it and serve that.
 * `force` always re-runs (the "Regenerate" button).
 */
export async function serveAgent<T extends object>(opts: {
  familyId: string
  agent: AgentName
  force?: boolean
  run: () => Promise<AgentResult<T>>
}): Promise<ServedAgentOutput<T>> {
  const now = getToday()

  if (!opts.force) {
    const cached = await getLatestRun<T>(opts.familyId, opts.agent)
    if (cached && isFresh(cached.createdAt, now)) {
      return serve(cached.output, cached.isFallback, cached.error, cached.createdAt.toISOString())
    }
  }

  const result = await opts.run()
  const generatedAt = await recordRun(opts.familyId, opts.agent, result.output, result.isFallback, result.error)
  return serve(result.output, result.isFallback, result.error, generatedAt)
}
