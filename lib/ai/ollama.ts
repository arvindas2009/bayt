import { createOpenAI } from '@ai-sdk/openai'

const ollama = createOpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

export const ollamaHealth = ollama.chat(
  process.env.OLLAMA_MODEL ?? 'deepseek-r1:8b'
)

// Runtime toggle — starts from env var, can be flipped via the toggle API
// without restarting the server.
let _vaultEnabled = process.env.PRIVACY_VAULT_ENABLED === 'true'

export function isPrivacyVaultEnabled(): boolean {
  return _vaultEnabled
}

export function setPrivacyVaultEnabled(val: boolean): void {
  _vaultEnabled = val
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
