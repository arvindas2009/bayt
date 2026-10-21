'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { memberColorAt } from '@/lib/design/members'
import type { Family } from '@/types'

const STEPS = ['Your household', 'What Bayt reads', 'Ready'] as const

const READS = [
  { title: 'Your calendar and records', body: 'Events, medications, appointments and deadlines that are already in Bayt, each with someone who owns it.' },
  { title: 'Documents you drop in', body: 'A school circular, a bill or a photo of a letter. Bayt proposes the tasks and dates, and you confirm before anything is saved.' },
  { title: 'Nothing else', body: 'Bayt is not connected to Google Calendar, a wearable, WhatsApp or a school portal in this version, and it does not read anything outside what you give it.' },
]

const BUTTON =
  'flex items-center gap-2 rounded-full bg-[var(--sand)] px-6 py-2.5 text-base font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [family, setFamily] = useState<Family | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/family', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Family>) : Promise.reject(new Error(String(r.status)))))
      .then((f) => !cancelled && setFamily(f))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const now = Date.now()
    const week = now + 7 * 86_400_000
    const events = (family?.members ?? []).flatMap((m) => m.calendarEvents).filter((e) => {
      const t = new Date(e.date).getTime()
      return t >= now && t <= week
    }).length
    const tasks = (family?.obligations ?? []).filter((o) => o.status === 'open').length
    return { events, tasks }
  }, [family])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-4xl leading-none text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]">
          Bayt
        </Link>
        <div className="flex items-center gap-3">
          <ol className="flex items-center gap-2 text-sm font-semibold" aria-label="Setup steps">
            {STEPS.map((label, i) => (
              <li
                key={label}
                aria-current={i === step ? 'step' : undefined}
                className={`rounded-full px-3 py-1 ${
                  i === step ? 'bg-[var(--sand)] text-[var(--on-sand)]' : 'text-[var(--ink-muted)]'
                }`}
              >
                <span className="num">{i + 1}</span>
                <span className="hidden sm:inline"> {label}</span>
              </li>
            ))}
          </ol>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
        {step === 0 && (
          <section aria-labelledby="step-title">
            <h1 id="step-title" className="font-display text-5xl md:text-6xl">Who is in your household</h1>
            <p className="mt-2 text-base text-[var(--ink-muted)]">Bayt shares the work between these people. You can add or change anyone in Settings.</p>

            {failed && <p className="mt-8 text-base text-[var(--ember)]">Could not load your household. Run the seed, then reload.</p>}
            {!family && !failed && <p className="mt-8 text-base text-[var(--ink-muted)]" role="status">Loading…</p>}
            {family && (
              <ul className="mt-6">
                {family.members.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-4 border-b border-[var(--line)] py-4">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: memberColorAt(i) }} aria-hidden />
                    <span className="flex-1 text-lg">{m.name}</span>
                    <span className="text-sm capitalize text-[var(--ink-muted)]">{m.role}, <span className="num">{m.age}</span></span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10">
              <button onClick={() => setStep(1)} disabled={!family} className={`${BUTTON} disabled:opacity-40`}>
                Continue <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="step-title">
            <h1 id="step-title" className="font-display text-5xl md:text-6xl">What Bayt reads</h1>
            <p className="mt-2 text-base text-[var(--ink-muted)]">Only what you have given it. Nothing is connected behind your back.</p>
            <ul className="mt-8 flex flex-col gap-6">
              {READS.map((r) => (
                <li key={r.title}>
                  <h2 className="font-display text-2xl">{r.title}</h2>
                  <p className="mt-1 text-base leading-relaxed text-[var(--ink-muted)]">{r.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm leading-relaxed text-[var(--ink-muted)]">
              Health details stay out of cloud models for meals and summaries, and the Privacy Vault in Settings keeps health analysis on this computer.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <button onClick={() => setStep(2)} className={BUTTON}>
                Continue <ArrowRight className="size-4" aria-hidden />
              </button>
              <button
                onClick={() => setStep(0)}
                className="rounded-full border-2 border-[var(--line-strong)] px-6 py-2 text-base font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
              >
                Back
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="step-title">
            <h1 id="step-title" className="font-display text-5xl md:text-6xl">Ready</h1>
            <p className="mt-2 text-base text-[var(--ink-muted)]">
              {family ? (
                <>
                  Bayt has <span className="num">{family.members.length}</span> people, <span className="num">{counts.events}</span>{' '}
                  {counts.events === 1 ? 'event' : 'events'} in the next 7 days and <span className="num">{counts.tasks}</span> open{' '}
                  {counts.tasks === 1 ? 'task' : 'tasks'} with deadlines to look after.
                </>
              ) : (
                'Open Bayt to see your household.'
              )}
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link href="/briefing" className={BUTTON}>
                Open Bayt <ArrowRight className="size-4" aria-hidden />
              </Link>
              <button
                onClick={() => setStep(1)}
                className="rounded-full border-2 border-[var(--line-strong)] px-6 py-2 text-base font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sand-text)]"
              >
                Back
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
