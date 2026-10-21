'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CalendarDays, CalendarPlus, FileInput, RefreshCw, School, UtensilsCrossed } from 'lucide-react'
import { useAgentStore } from '@/store/agent-store'
import { isDemoMode } from '@/lib/demo/mode'
import { usePageBusy } from '@/lib/hooks/usePageBusy'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { CARD } from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'
import PinButton from '@/components/pins/PinButton'
import type { PinId } from '@/lib/pins/registry'
import AddEventModal from '@/components/calendar/AddEventModal'
import CalendarConflicts from '@/components/operations/CalendarConflicts'
import DropInbox from '@/components/operations/DropInbox'
import FamilyAgenda from '@/components/operations/FamilyAgenda'
import MealPlanGrid from '@/components/operations/MealPlanGrid'
import SchoolAdminDrafts from '@/components/operations/SchoolAdminDrafts'
import SchoolHealthBriefs from '@/components/operations/SchoolHealthBriefs'

/** A tab's first line: what it is for, and the pin that puts it on the Briefing. */
function PanelBar({ pin, children }: { pin: PinId; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--ink-muted)]">{children}</p>
      <PinButton id={pin} />
    </div>
  )
}

const TAB_IDS = ['calendar', 'meals', 'inbox', 'school'] as const
type TabId = (typeof TAB_IDS)[number]

export default function OperationsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <Operations />
    </Suspense>
  )
}

function Operations() {
  const { agentStatuses, agentOutputs, agentMeta, runAgent } = useAgentStore()
  const status = agentStatuses.operations
  const output = agentOutputs.operations
  const thinking = status === 'thinking'
  const [showAddEvent, setShowAddEvent] = useState(false)

  // The tab lives in the URL (?tab=school), so a link can open the right part of the page.
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const asked = params.get('tab')
  const tab: TabId = TAB_IDS.includes(asked as TabId) ? (asked as TabId) : 'calendar'
  const setTab = (id: string) => router.replace(id === 'calendar' ? pathname : `${pathname}?tab=${id}`, { scroll: false })

  useEffect(() => {
    // Served from today's stored run unless it is stale, so opening the page does not call a model.
    if (!output) runAgent('operations')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  usePageBusy(!output && thinking)

  // Parts that need the agent's output wait for it; the agenda and the inbox do not.
  const pending = !output && status !== 'idle' ? (
    <div className="grid gap-6 lg:grid-cols-2">
      <CardSkeleton className="h-[260px]" />
      <CardSkeleton className="h-[260px]" />
    </div>
  ) : !output ? (
    <div className={`${CARD} flex flex-col items-start gap-3`}>
      <p className="text-base text-[var(--ink-muted)]">
        The week&rsquo;s plan could not be made{agentMeta.operations?.error ? `: ${agentMeta.operations.error}` : '.'}
      </p>
      <button onClick={() => runAgent('operations', { force: true })} className={BUTTON_SECONDARY}>
        <RefreshCw className="size-3.5" aria-hidden />
        Try again
      </button>
    </div>
  ) : null

  const schoolCount = output ? output.schoolDrafts.length + (output.schoolHealthBriefs?.length ?? 0) : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-10 pb-20 pt-8">
      <PageHeader
        shortTitle="Operations"
        title="Operations"
        subtitle={<p className="text-sm text-[var(--ink-muted)]">The week&rsquo;s calendar, meals and paperwork. Pick one at a time.</p>}
        actions={
          <>
            <button onClick={() => runAgent('operations', { force: true })} disabled={thinking} className={BUTTON_SECONDARY}>
              <RefreshCw className={`size-3.5 ${thinking ? 'animate-spin' : ''}`} aria-hidden />
              {thinking ? 'Working…' : 'Plan again'}
            </button>
            <button onClick={() => setShowAddEvent(true)} className={BUTTON_PRIMARY}>
              <CalendarPlus className="size-4" aria-hidden />
              Add event
            </button>
          </>
        }
      />

      {output?._mock && (
        <p className="-mt-4 text-sm text-[var(--ink-muted)]">
          Showing the built-in plan. The model was unavailable{output._error ? `: ${output._error}` : '.'}
        </p>
      )}

      <Tabs
        label="Operations"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'calendar',
            label: 'Calendar',
            icon: CalendarDays,
            count: output?.calendarConflicts.length,
            content: (
              <div className="flex flex-col gap-4">
                <PanelBar pin="clashes">The next days for everyone, and anything booked twice.</PanelBar>
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className={CARD}>
                    <FamilyAgenda />
                  </div>
                  <div className={CARD}>{output ? <CalendarConflicts conflicts={output.calendarConflicts} /> : pending}</div>
                </div>
              </div>
            ),
          },
          {
            id: 'meals',
            label: 'Meals',
            icon: UtensilsCrossed,
            content: output ? (
              <div className="flex flex-col gap-4">
              <PanelBar pin="meals-today">Seven days of meals that suit everyone, with substitutes where needed.</PanelBar>
              <section aria-labelledby="meals-title" className={CARD}>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="meals-title" className="font-display text-2xl text-[var(--ink)]">This week&rsquo;s meals</h2>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">Filled dots: the dish suits that person. Hollow: they get a substitute. Open a dish for details.</p>
                  </div>
                  <Link
                    href="/operations/meal-plan"
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
                  >
                    Full plan <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
                <MealPlanGrid weeklyPlan={output.weeklyPlan} />
              </section>
              </div>
            ) : (
              pending
            ),
          },
          {
            id: 'inbox',
            label: 'Drop anything',
            icon: FileInput,
            content: (
              <div className="flex flex-col gap-4">
                <PanelBar pin="drop">Drop a letter, bill or school note. You check every item before it is saved.</PanelBar>
                <div className={CARD}>
                  <DropInbox demo={isDemoMode} />
                </div>
              </div>
            ),
          },
          {
            id: 'school',
            label: 'School',
            icon: School,
            count: schoolCount,
            content: output ? (
              <div className="flex flex-col gap-4">
                <PanelBar pin="school">Bayt writes these. It never sends anything: copy the text and send it yourself.</PanelBar>
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  <section aria-labelledby="drafts-title" className={CARD}>
                    <h2 id="drafts-title" className="font-display text-2xl text-[var(--ink)]">Emails to the school</h2>
                    <SchoolAdminDrafts drafts={output.schoolDrafts} />
                  </section>
                  <section aria-labelledby="briefs-title" className={CARD}>
                    <h2 id="briefs-title" className="font-display text-2xl text-[var(--ink)]">Health notes for school</h2>
                    <SchoolHealthBriefs briefs={output.schoolHealthBriefs ?? []} />
                  </section>
                </div>
              </div>
            ) : (
              pending
            ),
          },
        ]}
      />

      {showAddEvent && <AddEventModal onClose={() => setShowAddEvent(false)} />}
    </div>
  )
}
