import { NextResponse } from 'next/server'
import { isPrivacyVaultEnabled, setPrivacyVaultEnabled, checkOllamaAvailable } from '@/lib/ai/ollama'

export const dynamic = 'force-dynamic'

/**
 * status: 'disabled' (cloud mode), 'active' (local model running), 'offline' (vault on but the local
 * model is unreachable: health AI is paused rather than falling back to the cloud).
 */
async function buildStatusResponse(enabled: boolean) {
  const ollamaOnline = enabled ? await checkOllamaAvailable() : null
  const status = !enabled ? 'disabled' : ollamaOnline ? 'active' : 'offline'
  return NextResponse.json({ enabled, ollamaOnline, status })
}

export async function GET() {
  return buildStatusResponse(await isPrivacyVaultEnabled())
}

export async function POST() {
  const next = !(await isPrivacyVaultEnabled())
  await setPrivacyVaultEnabled(next)
  return buildStatusResponse(next)
}
