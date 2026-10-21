import { NextRequest } from 'next/server'
import { handleAgentPost } from '@/lib/agents/route-helper'
import { runConnectionAgent } from '@/lib/agents/connection-agent'

export async function POST(req: NextRequest) {
  return handleAgentPost(req, 'connection', (family, offline) => runConnectionAgent(family, undefined, { offline }))
}
