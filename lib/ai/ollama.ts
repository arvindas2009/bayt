import { createOpenAI } from '@ai-sdk/openai'
import { getSetting, setSetting } from '@/lib/db/queries'

const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

export const ollamaHealth = ollama.chat(
  process.env.OLLAMA_MODEL ?? 'deepseek-r1:8b'
)

const VAULT_SETTING_KEY = 'privacyVault'

/**
 * Whether the Privacy Vault is on. The persisted setting is authoritative so the answer is the same
 * after a restart (a vault that silently reset to "off" would send health data to the cloud). The
 * env var is only the default for a database that has never been toggled.
 */
export async function isPrivacyVaultEnabled(): Promise<boolean> {
  try {
    const stored = await getSetting(VAULT_SETTING_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // Fail closed: if the setting cannot be read, treat the vault as ON so nothing leaves the machine.
    return true
  }
  return process.env.PRIVACY_VAULT_ENABLED === 'true'
}

export async function setPrivacyVaultEnabled(val: boolean): Promise<void> {
  await setSetting(VAULT_SETTING_KEY, val ? 'true' : 'false')
}

export async function checkOllamaAvailable(): Promise<boolean> {
  const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1'
  const root = base.replace(/\/v1\/?$/, '')
  try {
    const res = await fetch(`${root}/api/version`, {
      signal: AbortSignal.timeout(3_000),
    })
    return res.ok
  } catch {
    return false
  }
}
