import { NextRequest } from 'next/server'
import { handleAgentPost } from '@/lib/agents/route-helper'
import { runHealthAgent } from '@/lib/agents/health-agent'

export async function POST(req: NextRequest) {
  return handleAgentPost(req, 'health', (family, offline) => runHealthAgent(family, undefined, { offline }))
}
