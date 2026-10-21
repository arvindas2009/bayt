import { NextRequest } from 'next/server'
import { handleAgentPost } from '@/lib/agents/route-helper'
import { runOperationsAgent } from '@/lib/agents/operations-agent'

export async function POST(req: NextRequest) {
  return handleAgentPost(req, 'operations', (family, offline) => runOperationsAgent(family, undefined, { offline }))
}
