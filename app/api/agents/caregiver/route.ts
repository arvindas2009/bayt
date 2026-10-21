import { NextRequest } from 'next/server'
import { handleAgentPost } from '@/lib/agents/route-helper'
import { runCaregiverAgent } from '@/lib/agents/caregiver-agent'
import { createPendingHandoffs } from '@/lib/handoffs/store'

export async function POST(req: NextRequest) {
  return handleAgentPost(
    req,
    'caregiver',
    (family, offline) => runCaregiverAgent(family, undefined, { offline }),
    // Proposals become pending handoffs the recipient must accept; nothing is reassigned here.
    async (family, served) => {
      await createPendingHandoffs(family.id, served.proposals)
    },
  )
}
