import { NextRequest, NextResponse } from 'next/server'
import { respondToHandoff, type HandoffAction } from '@/lib/handoffs/store'

const ACTIONS: HandoffAction[] = ['accept', 'decline', 'redirect']

/** PATCH /api/handoffs/:id  { action: 'accept' | 'decline' | 'redirect', redirectToId? } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as { action?: string; redirectToId?: string }

  if (!body.action || !ACTIONS.includes(body.action as HandoffAction)) {
    return NextResponse.json({ error: 'action must be accept, decline or redirect' }, { status: 400 })
  }

  const result = await respondToHandoff(id, body.action as HandoffAction, { redirectToId: body.redirectToId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'Handoff not found' ? 404 : 409 })
  return NextResponse.json({ ok: true })
}
