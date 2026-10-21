import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo/mode'
import { getSimDate, setSimDate } from '@/lib/time/today'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function state() {
  const sim = getSimDate()
  return { enabled: isDemoMode, date: sim ? format(sim, 'yyyy-MM-dd') : null }
}

export async function GET() {
  return NextResponse.json(state())
}

/** Demo mode only. Body: { date: "YYYY-MM-DD" | null }. */
export async function POST(req: Request) {
  if (!isDemoMode) return NextResponse.json({ error: 'Date simulation is only available in demo mode' }, { status: 403 })
  const body = (await req.json().catch(() => null)) as { date?: string | null } | null
  const date = body?.date ?? null
  if (date !== null && (!ISO_DAY.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime()))) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD or null' }, { status: 400 })
  }
  setSimDate(date)
  return NextResponse.json(state())
}
