import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { geminiFlash, fallbackModel, NVIDIA_MODEL_ID } from '@/lib/ai/client'
import { REQUEST_BUDGET_MS } from '@/lib/ai/budget'
import { cleanEnv, readEnvStatus } from '@/lib/env'
import { isDemoMode } from '@/lib/demo/mode'
import prisma, { dbLocation } from '@/lib/db/prisma'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Hosting check: what the *deployed* server can see, with no secret values.
 *   GET /api/diagnostics           environment, database and time budget
 *   GET /api/diagnostics?probe=1   also sends one tiny request to each model and reports the real error
 */
async function probe(label: string, model: typeof geminiFlash) {
  const started = Date.now()
  try {
    await generateText({
      model,
      prompt: 'Reply with the single word: ok',
      maxOutputTokens: 16,
      abortSignal: AbortSignal.timeout(15_000),
    })
    return { model: label, ok: true, ms: Date.now() - started }
  } catch (error) {
    const err = error as { statusCode?: number; message?: string }
    return { model: label, ok: false, ms: Date.now() - started, status: err.statusCode, error: (err.message ?? String(error)).slice(0, 300) }
  }
}

export async function GET(request: Request) {
  const env = readEnvStatus()

  let familyCount: number | null = null
  let dbError: string | undefined
  try {
    familyCount = await prisma.family.count()
  } catch (error) {
    dbError = (error instanceof Error ? error.message : String(error)).slice(0, 300)
  }

  const body: Record<string, unknown> = {
    demoMode: isDemoMode,
    keys: {
      gemini: env.hasGemini,
      nvidia: env.hasNvidia,
      // A key pasted with its quotes is cleaned automatically; this just tells you it happened.
      geminiHadQuotes: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) && cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY) !== process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      nvidiaHadQuotes: Boolean(process.env.NVIDIA_API_KEY) && cleanEnv(process.env.NVIDIA_API_KEY) !== process.env.NVIDIA_API_KEY,
    },
    nvidiaModel: NVIDIA_MODEL_ID,
    requestBudgetMs: Number.isFinite(REQUEST_BUDGET_MS) ? REQUEST_BUDGET_MS : null,
    database: {
      found: dbLocation.source !== null,
      file: dbLocation.source ? path.basename(dbLocation.source) : null,
      copiedToTmp: dbLocation.copiedToTmp,
      familyCount,
      error: dbError,
    },
    node: process.version,
  }

  if (new URL(request.url).searchParams.get('probe') === '1') {
    body.probe = isDemoMode
      ? 'skipped: demo mode makes no model calls'
      : await Promise.all([probe('gemini-2.5-flash', geminiFlash), probe(NVIDIA_MODEL_ID, fallbackModel)])
  }

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
