import {
  generateObject,
  type FlexibleSchema,
  type InferSchema,
} from 'ai'
import type { z } from 'zod'
import { fallbackModel, NVIDIA_MODEL_ID } from './client'
import { logEnvStatusOnce } from '@/lib/env'

export type SafeGenerateResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type OutputFormat = 'object' | 'array' | 'enum' | 'no-schema'

// InferSchema<> resolves to `unknown` for Zod 4 schemas, so prefer z.infer when we have one.
type SchemaOutput<SCHEMA extends FlexibleSchema<unknown>> = SCHEMA extends z.ZodType
  ? z.infer<SCHEMA>
  : InferSchema<SCHEMA>

type GenerateObjectResultType<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat,
> = OUTPUT extends 'array' ? Array<SchemaOutput<SCHEMA>> : SchemaOutput<SCHEMA>

type GenerateObjectOptions<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat,
> = Omit<Parameters<typeof generateObject<SCHEMA, OUTPUT>>[0], 'abortSignal'> & {
  /** Re-stated so TypeScript can infer SCHEMA (inference does not see through Omit<Parameters<…>>). */
  schema: SCHEMA
  /** Timeout for the primary model call. Default: 45s */
  timeoutMs?: number
  /** Timeout for the fallback-provider call. Default: 60s */
  fallbackTimeoutMs?: number
  /** Provider-specific options passed through to generateObject. */
  providerOptions?: Record<string, unknown>
  /**
   * Allow falling over to another (cloud) provider on rate limit / auth / overload. Default true.
   * Set false for data that must never leave the machine (the Privacy Vault's local model).
   */
  failover?: boolean
}

const logTokenUsage = (
  model: string,
  usage: {
    inputTokens: number | undefined
    outputTokens: number | undefined
    totalTokens: number | undefined
    reasoningTokens?: number | undefined
  }
) => {
  console.log(`[AI] generateObject usage (${model})`, {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.reasoningTokens,
  })
}

/**
 * Errors where a different provider can plausibly succeed: rate limits, a missing or
 * rejected API key, and provider overload. Schema/validation failures are NOT included —
 * the same prompt would fail the same way on the fallback.
 */
export function shouldFailOver(error: unknown): boolean {
  const status = (error as { statusCode?: number } | null)?.statusCode
  if (status === 401 || status === 403 || status === 429 || status === 503) return true

  const msg = error instanceof Error ? error.message : String(error)
  return (
    /\b(401|403|429|503)\b/.test(msg) ||
    /quota|rate.?limit|RESOURCE_EXHAUSTED|UNAUTHENTICATED|PERMISSION_DENIED|overloaded/i.test(msg) ||
    /api key (is missing|not valid)|missing api key|invalid api key/i.test(msg)
  )
}

type Opts = Parameters<typeof generateObject>[0]

export async function safeGenerateObject<
  SCHEMA extends FlexibleSchema<unknown>,
  OUTPUT extends OutputFormat = InferSchema<SCHEMA> extends string ? 'enum' : 'object',
>(
  options: GenerateObjectOptions<SCHEMA, OUTPUT>,
): Promise<SafeGenerateResult<GenerateObjectResultType<SCHEMA, OUTPUT>>> {
  const { timeoutMs = 45_000, fallbackTimeoutMs = 60_000, failover = true, ...generateObjectOptions } = options
  const env = logEnvStatusOnce()

  const primarySignal = AbortSignal.timeout(timeoutMs)

  try {
    const result = await generateObject({
      ...generateObjectOptions,
      abortSignal: primarySignal,
    } as Opts)
    logTokenUsage('primary', result.usage)
    return { ok: true, data: result.object as GenerateObjectResultType<SCHEMA, OUTPUT> }
  } catch (primaryError) {
    const noFallbackProvider = generateObjectOptions.model === fallbackModel || !failover
    if (shouldFailOver(primaryError) && !noFallbackProvider && !env.hasNvidia) {
      const message = 'Primary model unavailable and NVIDIA_API_KEY is not set, so there is no fallback provider.'
      console.error(`[AI] ${message}`, primaryError)
      return { ok: false, error: message }
    }
    if (shouldFailOver(primaryError) && !noFallbackProvider) {
      console.warn(
        `[AI] Primary model unavailable (rate limit, auth or overload) — falling back to ${NVIDIA_MODEL_ID} via NVIDIA (budget: ${fallbackTimeoutMs / 1000}s)`
      )
      const fallbackSignal = AbortSignal.timeout(fallbackTimeoutMs)
      try {
        const result = await generateObject({
          ...generateObjectOptions,
          model: fallbackModel,
          abortSignal: fallbackSignal,
        } as Opts)
        logTokenUsage(`${NVIDIA_MODEL_ID} (fallback)`, result.usage)
        return { ok: true, data: result.object as GenerateObjectResultType<SCHEMA, OUTPUT> }
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        console.error('[AI] Fallback model also failed', fallbackError)
        return { ok: false, error: message }
      }
    }

    const message = primaryError instanceof Error ? primaryError.message : String(primaryError)
    console.error('[AI] generateObject failed', primaryError)
    return { ok: false, error: message }
  }
}
