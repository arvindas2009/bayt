'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { Avatar, CARD } from '@/components/ui/Card'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { fetchFamily } from '@/lib/api/family'
import { useMemberLookup } from '@/lib/hooks/useMemberLookup'
import { useFamilyStore } from '@/store/family-store'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]'

// Small tilts, like the landing page's colour-block cards, so the hand-off from the poster feels continuous.
const TILTS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[0.5deg]', '-rotate-1', 'rotate-1']

/**
 * "Who is using Bayt?": the door between the landing page and the app. Choosing a card sets the
 * global Viewing-as perspective (by id) and opens the Briefing. There is no password: this is a
 * shared household device, and the switcher in the TopBar can change person at any time.
 */
export default function LoginPage() {
  const router = useRouter()
  const family = useFamilyStore((s) => s.family)
  const setFamily = useFamilyStore((s) => s.setFamily)
  const viewingAsId = useFamilyStore((s) => s.viewingAsId)
  const setViewingAs = useFamilyStore((s) => s.setViewingAs)
  const [failed, setFailed] = useState(false)
  const [choosing, setChoosing] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchFamily()
      .then((f) => !cancelled && setFamily(f))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [setFamily])

  useEffect(() => {
    router.prefetch('/briefing')
  }, [router])

  const choose = (id: string) => {
    setChoosing(id)
    setViewingAs(id)
    router.push('/briefing')
  }

  const { members, colorOf } = useMemberLookup()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className={`font-display text-4xl leading-none text-[var(--ink)] ${focusRing}`}>
          Bayt
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8 md:px-10 md:pt-14">
        <h1 className="font-display text-[clamp(3.25rem,8vw,6.5rem)]">
          <span className="block">Who is</span>
          <span className="block text-[var(--sand-text)]">using Bayt?</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--ink-muted)]">
          Bayt shows each person their own briefing, their own requests and their own load. You can switch person later from the top bar.
        </p>

        {failed && (
          <p className="mt-10 text-base text-[var(--ember)]" role="alert">
            Could not load your household. Run the seed, then reload.
          </p>
        )}

        {!family && !failed && (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className={`${CARD} h-52 animate-pulse bg-[var(--surface-raised)]`} />
            ))}
          </ul>
        )}

        {family && (
          <Stagger as="ul" className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" gap={0.07}>
            {members.map((m, i) => {
              const color = colorOf(m.id)
              const last = m.id === viewingAsId
              return (
                <StaggerItem as="li" key={m.id}>
                  <button
                    type="button"
                    onClick={() => choose(m.id)}
                    disabled={choosing !== null}
                    aria-label={`Continue as ${m.name}, ${m.role}, ${m.age}`}
                    className={`group relative flex h-full w-full flex-col items-start gap-6 overflow-hidden rounded-3xl border-2 bg-[var(--surface)] p-5 text-left transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[0_24px_48px_-28px_rgb(0_0_0/0.7)] active:scale-[0.97] disabled:cursor-wait ${TILTS[i % TILTS.length]} ${
                      last ? 'border-[var(--sand-text)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                    } ${choosing && choosing !== m.id ? 'opacity-40' : ''} ${focusRing}`}
                  >
                    {/* The member's colour fills the card from below on hover */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-1.5 origin-bottom transition-[height] duration-300 group-hover:h-full group-focus-visible:h-full"
                      style={{ background: color, opacity: 0.18 }}
                    />
                    <span className="relative flex w-full items-start justify-between">
                      <Avatar name={m.name} color={color} size="xl" className="transition-transform duration-300 group-hover:scale-110" />
                      {last && (
                        <span className="rounded-full bg-[var(--sand)] px-2.5 py-1 text-xs font-semibold text-[var(--on-sand)]">Last time</span>
                      )}
                    </span>
                    <span className="relative mt-auto flex w-full items-end justify-between gap-2">
                      <span>
                        <span className="block font-display text-4xl leading-none">{m.name}</span>
                        <span className="mt-2 block text-sm capitalize text-[var(--ink-muted)]">
                          {m.role}, <span className="num">{m.age}</span>
                        </span>
                      </span>
                      <ArrowRight
                        className="size-5 shrink-0 -translate-x-1 text-[var(--ink-muted)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[var(--ink)] group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  </button>
                </StaggerItem>
              )
            })}
          </Stagger>
        )}

        {family && members.length === 0 && (
          <p className="mt-10 text-base text-[var(--ink-muted)]">
            No one is in this household yet.{' '}
            <Link href="/onboarding" className={`font-semibold text-[var(--sand-text)] underline ${focusRing}`}>
              Set it up
            </Link>
            .
          </p>
        )}

        <p className="mt-12 text-sm text-[var(--ink-muted)]">
          New here?{' '}
          <Link href="/onboarding" className={`font-semibold text-[var(--ink)] underline underline-offset-4 ${focusRing}`}>
            Set up your household
          </Link>
        </p>
      </main>
    </div>
  )
}
