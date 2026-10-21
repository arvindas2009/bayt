import { z } from 'zod'

// Server-side environment check. Nothing here throws: the app must still boot
// (and serve fallback data) when a key is missing. We only report precisely
// what is missing so "PREVIEW DATA" is never a mystery.

/**
 * Hosting dashboards (Netlify, Vercel) keep a value exactly as pasted. `.env.local.example` shows the
 * keys in quotes, so a pasted `"AIza..."` arrives with the quote characters and is rejected by the
 * provider as an invalid key. Strip whitespace and one pair of surrounding quotes.
 */
export const cleanEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim().replace(/^(["'])(.*)\1$/, '$2').trim()
  return trimmed ? trimmed : undefined
}

const present = (value: string | undefined) => z.string().trim().min(1).safeParse(cleanEnv(value)).success

export interface EnvStatus {
  hasGemini: boolean
  hasNvidia: boolean
  /** Names of variables that are absent. */
  missing: string[]
}

export function readEnvStatus(env: Record<string, string | undefined> = process.env): EnvStatus {
  const hasGemini = present(env.GOOGLE_GENERATIVE_AI_API_KEY)
  const hasNvidia = present(env.NVIDIA_API_KEY)

  const missing: string[] = []
  if (!present(env.DATABASE_URL)) missing.push('DATABASE_URL')
  if (!hasGemini) missing.push('GOOGLE_GENERATIVE_AI_API_KEY')
  if (!hasNvidia) missing.push('NVIDIA_API_KEY')

  return { hasGemini, hasNvidia, missing }
}

let logged = false

/** Logs missing keys once per server process. Safe to call from any hot path. */
export function logEnvStatusOnce(): EnvStatus {
  const status = readEnvStatus()
  if (!logged) {
    logged = true
    if (status.missing.length > 0) {
      const consequence = !status.hasGemini && !status.hasNvidia
        ? 'No AI provider is configured: agents will return fallback data.'
        : !status.hasGemini
          ? 'Gemini calls will fail over to Nemotron.'
          : ''
      console.warn(`[env] Missing: ${status.missing.join(', ')}. ${consequence}`.trim())
    }
  }
  return status
}
