import { NextResponse } from 'next/server'
import { isPrivacyVaultEnabled, setPrivacyVaultEnabled, checkOllamaAvailable } from '@/lib/ai/ollama'

export const dynamic = 'force-dynamic'

async function buildStatusResponse(enabled: boolean) {
  const ollamaOnline = enabled ? await checkOllamaAvailable() : null
  const status = !enabled ? 'disabled' : ollamaOnline ? 'active' : 'offline'
  return NextResponse.json({ enabled, ollamaOnline, status })
}

export async function GET() {
  return buildStatusResponse(isPrivacyVaultEnabled())
}

export async function POST() {
  const next = !isPrivacyVaultEnabled()
  setPrivacyVaultEnabled(next)
  return buildStatusResponse(next)
}
