'use client'

import { format, parseISO } from 'date-fns'
import { Users } from 'lucide-react'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { Avatar, CARD, CARD_HOVER, IconBadge } from '@/components/ui/Card'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import type { ConnectionMicroAction } from '@/types/agents'

const MAX = 2

/** Up to two small, dated ways to spend time together, taken from the Connection agent. */
export default function MicroActions({ actions }: { actions: ConnectionMicroAction[] | undefined }) {
  const { nameOf, colorOf } = useMemberLookup()
  const list = [...(actions ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX)
  if (list.length === 0) return null

  return (
    <section aria-labelledby="together-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBadge icon={Users} tone="palm" />
        <h2 id="together-title" className="font-display text-2xl text-[var(--ink)]">
          Time together
        </h2>
      </div>
      <Stagger as="ul" className="grid gap-4 md:grid-cols-2">
        {list.map((a, i) => (
          <StaggerItem as="li" key={i} className={`${CARD} ${CARD_HOVER} flex flex-col gap-4 !p-5`}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex -space-x-2">
                {a.memberIds.map((id) => (
                  <Avatar key={id} name={nameOf(id)} color={colorOf(id)} size="md" className="ring-2 ring-[var(--surface)]" />
                ))}
              </span>
              <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                {format(parseISO(a.date), 'EEE d MMM')}
              </span>
            </div>
            <p className="text-base leading-relaxed text-[var(--ink)]">{a.description}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
