import prisma from '@/lib/db/prisma'
import type { SourceRef } from '@/types/agents'

/** One evidence record, resolved from an id to something a person can read. */
export interface ResolvedSource {
  type: SourceRef['type']
  id: string
  title: string
  /** ISO moment the record happens or is due (null when it has none). */
  when: string | null
  /** Member who owns it, so the UI can show a name (never an id). */
  ownerId: string | null
  detail?: string
}

const MAX_REFS = 12

/**
 * Turn source refs into readable records. Ids that do not exist are dropped, so a model that
 * invents or garbles an id can never put a made-up source in front of the user.
 */
export async function resolveSources(refs: SourceRef[]): Promise<ResolvedSource[]> {
  const unique = new Map<string, SourceRef>()
  for (const r of refs.slice(0, MAX_REFS * 2)) {
    if (r && typeof r.id === 'string' && typeof r.type === 'string') unique.set(`${r.type}:${r.id}`, r)
  }
  const wanted = [...unique.values()].slice(0, MAX_REFS)
  const idsOf = (type: SourceRef['type']) => wanted.filter((r) => r.type === type).map((r) => r.id)

  const [events, meds, obligations, handoffs] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { id: { in: idsOf('event') } } }),
    prisma.medication.findMany({ where: { id: { in: idsOf('medication') } } }),
    prisma.obligation.findMany({ where: { id: { in: idsOf('obligation') } } }),
    prisma.handoff.findMany({ where: { id: { in: idsOf('handoff') } } }),
  ])

  const byKey = new Map<string, ResolvedSource>()
  for (const e of events) {
    byKey.set(`event:${e.id}`, {
      type: 'event',
      id: e.id,
      title: e.title,
      when: e.date.toISOString(),
      ownerId: e.ownerId ?? null,
    })
  }
  for (const m of meds) {
    byKey.set(`medication:${m.id}`, {
      type: 'medication',
      id: m.id,
      // Medication names are health data: show the schedule and who gives it, not the drug.
      title: 'Medication schedule',
      when: null,
      ownerId: m.ownerId ?? m.memberId,
      detail: m.frequency,
    })
  }
  for (const o of obligations) {
    byKey.set(`obligation:${o.id}`, {
      type: 'obligation',
      id: o.id,
      title: o.title,
      when: o.dueDate.toISOString(),
      ownerId: o.ownerId,
      detail: o.consequence,
    })
  }
  for (const h of handoffs) {
    byKey.set(`handoff:${h.id}`, {
      type: 'handoff',
      id: h.id,
      title: h.itemTitle,
      when: h.createdAt.toISOString(),
      ownerId: h.fromId,
      detail: h.reason,
    })
  }

  // Keep the caller's order; anything not found is silently dropped.
  return wanted.flatMap((r) => {
    const found = byKey.get(`${r.type}:${r.id}`)
    return found ? [found] : []
  })
}
