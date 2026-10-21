import Link from 'next/link'
import { ArrowRight, Check, CloudOff, FileText, KeyRound, Lock, MousePointer2, School } from 'lucide-react'
import HeroSceneLazy from '@/components/landing/HeroSceneLazy'
import LandingField from '@/components/landing/LandingField'
import Marquee from '@/components/landing/Marquee'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { BURNOUT_THRESHOLD, WEEKLY_CAPACITY_HOURS } from '@/lib/load/reference-durations'
import { MAX_ABSENCE_DAYS, MIN_ABSENCE_DAYS } from '@/lib/resilience/simulate'

// Everything on this page is explanation. Figures are the engine's own constants, imported, so
// the page cannot drift from the code; the only other numbers belong to the labelled sample.

const TAPE = ['See the load', 'Find the fragile', 'Hand over with consent', 'Drop anything in', 'Built for Gulf households']

// The local shape of household work, as stickers.
const GULF_LOAD = [
  { label: 'Residence visa', tone: 'bg-[var(--sand)] text-[var(--on-sand)]', rot: '-rotate-3' },
  { label: 'Emirates ID', tone: 'bg-[var(--ember)] text-[var(--on-ember)]', rot: 'rotate-2' },
  { label: 'Ejari', tone: 'bg-[var(--dusk)] text-[var(--on-dusk)]', rot: '-rotate-2' },
  { label: 'DEWA bills', tone: 'bg-[var(--zest)] text-[var(--on-zest)]', rot: 'rotate-3' },
  { label: 'Salik', tone: 'border-2 border-[var(--ink)] text-[var(--ink)]', rot: '-rotate-1' },
  { label: 'School fee instalments', tone: 'bg-[var(--palm)] text-[var(--bg)]', rot: 'rotate-2' },
  { label: 'Medication rounds', tone: 'bg-[var(--ink)] text-[var(--bg)]', rot: '-rotate-3' },
  { label: 'Caring for grandparents', tone: 'bg-[var(--sand)] text-[var(--on-sand)]', rot: 'rotate-1' },
  { label: 'Ramadan routines', tone: 'bg-[var(--dusk)] text-[var(--on-dusk)]', rot: '-rotate-2' },
  { label: 'Dust-season asthma', tone: 'bg-[var(--ember)] text-[var(--on-ember)]', rot: 'rotate-3' },
]

const WHAT = [
  {
    title: 'Sees the load',
    body: 'Calendars, paperwork and medication rounds become hours, a score out of 100 and a share for each person. One tested model decides every number, so two screens can never disagree.',
    tone: 'bg-[var(--sand)] text-[var(--on-sand)]',
    tilt: '-rotate-2',
  },
  {
    title: 'Finds the fragility',
    body: 'Resilience Mode simulates an absence day by day and lists every task nobody else can do, with when it fails and what happens if it does.',
    tone: 'bg-[var(--ember)] text-[var(--on-ember)]',
    tilt: 'rotate-2',
  },
  {
    title: 'Moves work with consent',
    body: 'Bayt writes handoff requests. Nothing changes owner until the person asked says yes, and the previous owner stays on as backup.',
    tone: 'bg-[var(--dusk)] text-[var(--on-dusk)]',
    tilt: 'rotate-2',
  },
  {
    title: 'Handles the rest of the week',
    body: 'Diet-safe Emirati meal plans, calendar clashes, a drop-anything document inbox, health overviews and a short daily briefing written for each person.',
    tone: 'bg-[var(--zest)] text-[var(--on-zest)]',
    tilt: '-rotate-2',
  },
]

const SCORE_RULES = [
  { title: 'The next 7 days', body: 'Load is counted over the coming week, from what is on the calendar and in the paperwork.' },
  { title: 'Only owned work counts', body: 'An event counts for whoever drives, attends or escorts. A medicine counts only if someone other than the patient gives it.' },
  { title: `Score = hours ÷ ${WEEKLY_CAPACITY_HOURS} h × 100`, body: 'Capped at 100. A share is that person’s hours over the family’s hours, as a computed percentage.' },
  { title: `Burnout line ${BURNOUT_THRESHOLD}/100`, body: 'Anyone at or above it is flagged, with the days since their last rest block.' },
]

const CONSENT = [
  { step: 'Plan', body: 'Code picks who could step in: the lowest-loaded present parent who stays under the burnout line.' },
  { step: 'Word', body: 'An optional model pass rewrites the steps. Any line that adds a number or a gendered pronoun is dropped.' },
  { step: 'Ask', body: 'Each placement becomes a request in that person’s inbox: Accept, Not now, or Suggest someone else.' },
  { step: 'Re-run', body: 'Accepting moves the task and keeps the old owner as backup. The stress test runs again and shows before and after.' },
]

const PIPELINE = [
  { n: '1', title: 'Read', body: 'Drop a file or paste text. A model proposes tasks and events, each with the exact quoted words.' },
  { n: '2', title: 'Check', body: 'Code reads the dates itself, drops anything whose quote is not in the source, and fixes the task type.' },
  { n: '3', title: 'Review', body: 'A person edits each item and chooses who owns it. Nothing is saved yet.' },
  { n: '4', title: 'Save', body: 'Only then are tasks or events written, and clashes checked again.' },
]

const SEASONS = [
  { name: 'Ramadan', body: 'Meals switch to suhoor and iftar, and Bayt waits longer before suggesting time together.', tone: 'bg-[var(--dusk)] text-[var(--on-dusk)]' },
  { name: 'Eid', body: 'Both Eids are in the calendar, with a few days either side for the moon sighting.', tone: 'bg-[var(--sand)] text-[var(--on-sand)]' },
  { name: 'Dust season', body: 'Health notes name whoever actually has asthma in the family’s records.', tone: 'bg-[var(--zest)] text-[var(--on-zest)]' },
  { name: 'Summer heat', body: 'Plans and notes adjust for the hottest months.', tone: 'bg-[var(--ember)] text-[var(--on-ember)]' },
  { name: 'School terms', body: 'UAE terms, exams and holidays shape the week, and National Day is on the calendar.', tone: 'bg-[var(--palm)] text-[var(--bg)]' },
]

const PRIVACY = [
  { icon: Lock, title: 'Constraints, not diagnoses', body: 'Meal planning gets “nut-free” or “low sodium”, never a condition or a medicine name.' },
  { icon: CloudOff, title: 'The Privacy Vault', body: 'With it on, health analysis runs on a model on your own computer. If that model is down, Bayt writes the summary itself and sends nothing.' },
  { icon: KeyRound, title: 'Aliases, not ids', body: 'The document reader sees people as m1, m2. Records a model invents are dropped before anyone sees them.' },
  { icon: School, title: 'School notes stay local', body: 'Health notes for school are filled from templates on this computer and never reach a model.' },
]

const PRINCIPLES = [
  { title: 'Code decides, the model writes', body: 'Load, conflicts, priorities, meal checks and resilience are computed. Models only phrase, draft and plan.' },
  { title: 'Consent', body: 'Bayt proposes and a person accepts. Nothing changes who does what until they say yes.' },
  { title: 'Privacy by design', body: 'Models receive abstract constraints and hours, never diagnoses or medication names.' },
  { title: 'Honest numbers', body: 'Every figure comes from a documented table, and planning assumptions are labelled as such.' },
  { title: 'Honest status', body: '“Preview” appears only when a model really failed. Demo mode says Demo. Sample figures say Simulated.' },
  { title: 'People, not names', body: 'Members are matched by id or role, never by name, and generated text uses no gendered pronouns.' },
]

// The fictional demo household. Roles and ages only: no health details on a public page.
const FAMILY = [
  { name: 'Salem', role: 'Parent', age: 45, color: 'var(--sand)' },
  { name: 'Fatima', role: 'Parent', age: 42, color: 'var(--ember)' },
  { name: 'Layla', role: 'Child', age: 16, color: 'var(--dusk)' },
  { name: 'Khalid', role: 'Child', age: 12, color: 'var(--palm)' },
  { name: 'Aisha', role: 'Grandparent', age: 71, color: 'var(--zest)' },
]

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sand-text)]'
const pillPrimary = `inline-flex items-center gap-2 rounded-full bg-[var(--sand)] font-semibold text-[var(--on-sand)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] ${focusRing}`
const pillOutline = `inline-flex items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--bg)]/40 font-semibold text-[var(--ink)] backdrop-blur transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] ${focusRing}`
const sectionTitle = 'font-display text-[clamp(3.25rem,8.5vw,7rem)]'

const NAV = [
  { href: '#what', label: 'What it does' },
  { href: '#load', label: 'The load' },
  { href: '#resilience', label: 'Resilience' },
  { href: '#privacy', label: 'Privacy' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--sand)] focus:px-4 focus:py-2 focus:text-[var(--on-sand)]"
      >
        Skip to content
      </a>

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 md:px-10">
        <span className="font-display text-4xl leading-none text-[var(--ink)]">Bayt</span>
        <nav aria-label="Page" className="hidden items-center gap-8 text-sm font-semibold text-[var(--ink-muted)] lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={`transition-colors hover:text-[var(--ink)] ${focusRing}`}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/briefing" className={`${pillOutline} px-5 py-2 text-sm`}>
            Open Bayt
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero: the poster headline over the interactive sample household */}
        <section className="relative -mt-[84px] flex min-h-[100svh] items-center pt-[84px]">
          <HeroSceneLazy className="absolute inset-0 z-0" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 pt-8 md:px-10">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--bg)]/60 px-4 py-1.5 text-sm font-semibold text-[var(--ink)] backdrop-blur">
                <span className="size-2 animate-pulse rounded-full bg-[var(--sand)]" aria-hidden />
                A family operating system for Gulf households
              </p>
            </Reveal>
            <h1 className="mt-6 font-display text-[clamp(4rem,12vw,10rem)]">
              <Reveal as="span" delay={0.05} className="block">
                Invisible
              </Reveal>
              <Reveal as="span" delay={0.15} className="block text-outline">
                work, made
              </Reveal>
              <Reveal as="span" delay={0.25} className="block text-[var(--sand-text)]">
                visible.
              </Reveal>
            </h1>
            <Reveal delay={0.35}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--ink-muted)]">
                Every household runs on coordination: school runs, renewals, medication rounds, meals for five different diets. That work is
                unpaid, unseen, and usually falls on one person. Bayt measures it, shows what would break without that person, and moves work
                only when someone agrees to take it.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/briefing" className={`${pillPrimary} px-6 py-3 text-base`}>
                  Open Bayt
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/onboarding" className={`${pillOutline} px-6 py-3 text-base`}>
                  Set up your household
                </Link>
              </div>
            </Reveal>
          </div>
          <p className="absolute bottom-6 right-6 z-10 hidden max-w-xs items-start gap-2 rounded-2xl bg-[var(--bg)]/60 p-3 text-xs leading-relaxed text-[var(--ink-muted)] backdrop-blur md:flex md:right-10">
            <MousePointer2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            A sample household: each swarm is one person, bigger means more invisible work. Move your cursor through it.
          </p>
        </section>

        {/* Two tapes crossing */}
        <div className="relative my-4 h-40 md:h-44">
          <Marquee items={TAPE} tone="zest" reverse className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[3deg]" />
          <Marquee items={TAPE} tone="sand" className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 -rotate-[2deg]" />
        </div>

        {/* The problem */}
        <section id="problem" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <Reveal>
              <h2 className={sectionTitle}>
                <span className="block">The work</span>
                <span className="block text-outline">nobody</span>
                <span className="block text-[var(--ember)]">sees.</span>
              </h2>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--ink-muted)]">
                Family apps track calendars and chores, but they treat every task as equal and every person as interchangeable. They never ask
                who is carrying the household, or what happens when that person is ill, travelling or worn out. In the Gulf the load has its
                own shape too.
              </p>
            </Reveal>
            <Stagger as="ul" className="flex flex-wrap gap-3 lg:justify-end" gap={0.05}>
              {GULF_LOAD.map((t) => (
                <StaggerItem as="li" key={t.label} className={`${t.tone} ${t.rot} rounded-full px-5 py-2.5 text-base font-semibold transition-transform duration-300 hover:rotate-0 hover:scale-105`}>
                  {t.label}
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* What Bayt does */}
        <section id="what" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <Reveal>
            <h2 className={sectionTitle}>
              <span className="block text-outline">What</span>
              <span className="block">Bayt does</span>
            </h2>
          </Reveal>
          <Stagger className="mt-14 grid gap-8 md:grid-cols-2 md:gap-10" gap={0.1}>
            {WHAT.map((w) => (
              <StaggerItem key={w.title}>
                <article className={`${w.tone} ${w.tilt} h-full rounded-[2rem] p-8 transition-transform duration-300 hover:rotate-0 hover:scale-[1.02] md:p-10`}>
                  <h3 className="font-display text-4xl md:text-5xl">{w.title}</h3>
                  <p className="mt-4 max-w-md text-base font-medium leading-relaxed opacity-85">{w.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* The load, and how it is counted */}
        <section id="load" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <Reveal>
            <h2 className={sectionTitle}>
              <span className="block">See the</span>
              <span className="block text-[var(--sand-text)]">load.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <Reveal as="div">
              <figure className="rounded-[2rem] bg-[var(--surface)] p-4 md:p-6">
                <LandingField />
                <figcaption className="mt-2 text-center text-sm text-[var(--ink-muted)]">
                  A sample household. Each person is a glowing body, larger and hotter with more invisible work.
                </figcaption>
              </figure>
            </Reveal>
            <div>
              <p className="text-lg leading-relaxed text-[var(--ink-muted)]">
                One function counts every hour, so the briefing, the load page and the stress test always agree. The minutes for each kind of
                task come from a table labelled as planning assumptions.
              </p>
              <Stagger as="ol" className="mt-8 grid gap-4 sm:grid-cols-2">
                {SCORE_RULES.map((r) => (
                  <StaggerItem as="li" key={r.title} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-transform duration-300 hover:-translate-y-1">
                    <h3 className="font-display text-2xl">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{r.body}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* Resilience Mode and the consent loop */}
        <section id="resilience" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <div className="rounded-[2rem] bg-[var(--surface)] p-8 md:p-14">
            <Reveal>
              <h2 className="font-display text-[clamp(3rem,7.5vw,6.5rem)]">
                <span className="block">What breaks if</span>
                <span className="block text-[var(--ember)]">someone is away?</span>
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--ink-muted)]">
                Pick a person and anywhere from {MIN_ABSENCE_DAYS} to {MAX_ABSENCE_DAYS} days. Bayt walks every day of the absence. A task with a
                named backup who is still home is covered; a task without one fails, with the day it fails and what happens next. It is instant
                and uses no model.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
                <li className="rounded-full bg-[var(--ember)] px-3 py-1 text-[var(--on-ember)]">Missed medicine: urgent</li>
                <li className="rounded-full bg-[var(--zest)] px-3 py-1 text-[var(--on-zest)]">Missed paperwork: important</li>
                <li className="rounded-full bg-[var(--dusk)] px-3 py-1 text-[var(--on-dusk)]">Missed event: routine</li>
              </ul>
            </Reveal>

            <h3 className="mt-14 font-display text-3xl md:text-4xl">From finding to fix, with consent</h3>
            <Stagger as="ol" className="relative mt-8 grid gap-6 md:grid-cols-4" gap={0.12}>
              {CONSENT.map((c, i) => (
                <StaggerItem as="li" key={c.step} className="relative flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--sand)] font-display text-2xl text-[var(--on-sand)]">
                      {i + 1}
                    </span>
                    {i < CONSENT.length - 1 && <span aria-hidden className="hidden h-0.5 flex-1 bg-[var(--line-strong)] md:block" />}
                  </div>
                  <h4 className="font-display text-2xl">{c.step}</h4>
                  <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{c.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Code decides, the model writes */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
            <Reveal>
              <h2 className={sectionTitle}>
                <span className="block">Code decides,</span>
                <span className="block text-outline">the model</span>
                <span className="block text-[var(--dusk)]">writes.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-lg leading-relaxed text-[var(--ink-muted)]">
                Every number is computed by tested code. Language models only phrase what the code has already worked out, and their words are
                checked before anyone sees them: a rewrite that adds a number, drops one, or claims a comparison the code never made is thrown
                away and the plain sentence is shown instead.
              </p>
            </Reveal>
          </div>

          <h3 className="mt-16 flex items-center gap-3 font-display text-3xl md:text-4xl">
            <FileText className="size-7 text-[var(--sand-text)]" aria-hidden />
            From a document to a saved task
          </h3>
          <Stagger as="ol" className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-4" gap={0.1}>
            {PIPELINE.map((s) => (
              <StaggerItem as="li" key={s.n} className="flex gap-5">
                <span className="font-display text-outline text-8xl leading-none" aria-hidden>
                  {s.n}
                </span>
                <div className="pt-2">
                  <h4 className="font-display text-3xl">{s.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Built for the Gulf */}
        <section id="gulf" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <Reveal>
            <h2 className={sectionTitle}>
              <span className="block">Built for</span>
              <span className="block text-[var(--palm)]">the Gulf.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--ink-muted)]">
              A dated calendar of the seasons that change how a household runs. When one applies, Bayt says so at the top of every page and
              adjusts what it suggests.
            </p>
          </Reveal>
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5" gap={0.08}>
            {SEASONS.map((s, i) => (
              <StaggerItem key={s.name}>
                <article
                  className={`${s.tone} ${i % 2 ? 'rotate-1' : '-rotate-1'} flex h-full flex-col gap-3 rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-2 hover:rotate-0`}
                >
                  <h3 className="font-display text-3xl">{s.name}</h3>
                  <p className="text-sm font-medium leading-relaxed opacity-85">{s.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <div className="rounded-[2rem] bg-[var(--ember)] p-8 text-[var(--on-ember)] md:p-14">
            <Reveal>
              <h2 className="font-display text-[clamp(3rem,7vw,6rem)]">Health stays private</h2>
            </Reveal>
            <Stagger as="ul" className="mt-10 grid gap-6 md:grid-cols-2" gap={0.1}>
              {PRIVACY.map((p) => (
                <StaggerItem as="li" key={p.title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--on-ember)] text-[var(--ember)]">
                    <p.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="mt-1 text-base font-medium leading-relaxed opacity-90">{p.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="mt-10 text-sm font-medium opacity-80">Bayt is not medical advice. It tells you to ask the relevant clinician.</p>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <Reveal>
            <h2 className={sectionTitle}>
              <span className="block text-outline">Six</span>
              <span className="block">principles</span>
            </h2>
          </Reveal>
          <Stagger as="ol" className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" gap={0.07}>
            {PRINCIPLES.map((p, i) => (
              <StaggerItem
                as="li"
                key={p.title}
                className="group rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[var(--sand-text)]"
              >
                <span className="font-display text-outline text-6xl leading-none transition-colors duration-300 group-hover:text-[var(--sand-text)]" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-2xl">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{p.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* The demo household */}
        <section id="family" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 md:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <Reveal>
              <h2 className="font-display text-[clamp(2.75rem,6vw,5rem)]">Meet the demo family</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--ink-muted)]">
                The Al-Mazrouei household is fictional and deliberately unbalanced, so every feature has real work to do. Open Bayt and switch
                &ldquo;Viewing as&rdquo; to see the same week from each person&rsquo;s side.
              </p>
            </Reveal>
            <Stagger as="ul" className="flex flex-wrap gap-4" gap={0.08}>
              {FAMILY.map((m) => (
                <StaggerItem
                  as="li"
                  key={m.name}
                  className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] py-2 pl-2 pr-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-full font-display text-xl text-[var(--on-member)]"
                    style={{ background: m.color }}
                  >
                    {m.name[0]}
                  </span>
                  <span>
                    <span className="block text-base font-semibold">{m.name}</span>
                    <span className="text-sm text-[var(--ink-muted)]">
                      {m.role}, {m.age}
                    </span>
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pb-24 pt-8 md:px-10">
          <Reveal>
            <h2 className={sectionTitle}>
              <span className="block">See your</span>
              <span className="block text-[var(--ember)]">household.</span>
            </h2>
          </Reveal>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--ink-muted)]">
            {['Nothing is sent on your behalf', 'Nothing moves without a yes', 'Every number has a source'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-[var(--sand-text)]" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <Link href="/briefing" className={`${pillPrimary} px-7 py-3.5 text-lg`}>
            Open Bayt
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between md:px-10">
          <span className="font-display text-4xl leading-none text-[var(--ink)]">Bayt</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-6 font-semibold">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={`hover:text-[var(--ink)] ${focusRing}`}>
                {n.label}
              </a>
            ))}
            <Link href="/onboarding" className={`hover:text-[var(--ink)] ${focusRing}`}>
              Set up
            </Link>
          </nav>
          <span>Built for the 5th Annual COE Hackathon, 2026</span>
        </div>
      </footer>
    </div>
  )
}
