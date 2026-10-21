# Bayt: Feature Reference

Every feature of the app: what it is, how it is implemented, how to use it, and what it needs. Written from the code as of 15 October 2026 (Phases 0-4 done, Phases 5-6 planned).

- [1. What Bayt is](#1-what-bayt-is)
- [2. Requirements and setup](#2-requirements-and-setup)
- [3. AI layer: Gemini and NVIDIA](#3-ai-layer-gemini-and-nvidia)
- [4. Design principles](#4-design-principles)
- [5. Features, page by page](#5-features-page-by-page)
- [6. Features that cut across pages](#6-features-that-cut-across-pages)
- [7. Deterministic engine (`lib/`)](#7-deterministic-engine-lib)
- [8. Agents](#8-agents)
- [9. API reference](#9-api-reference)
- [10. Data model](#10-data-model)
- [11. Demo family and seed data](#11-demo-family-and-seed-data)
- [12. Planned features](#12-planned-features)
- [13. Known gaps and untested paths](#13-known-gaps-and-untested-paths)

---

## 1. What Bayt is

An AI-powered family operating system (Next.js 15, TypeScript) built around one story:

> Bayt sees the invisible load, finds where the family is fragile, and redistributes the load **with everyone's consent**.

The demo household is the **Al-Mazrouei** family: Salem (parent, 45), Fatima (parent, 42), Layla (child, 16), Khalid (child, 12), Aisha (grandparent, 71). It is set in the UAE (Emirati meals, Ramadan/Eid, dust season, UAE school terms, Emirates ID/Ejari/DEWA/Salik paperwork).

Built for the 5th Annual COE Hackathon, 2026.

## 2. Requirements and setup

### Runtime requirements

| Need | Detail |
|---|---|
| Node.js | Recent LTS (Next 15.5, React 19.1) |
| Database | SQLite file via Prisma 7 + `better-sqlite3` adapter. No server needed |
| Browser | Any modern browser. WebGL2 for the load visual (falls back to a CSS gradient without it) |
| Gemini key | `GOOGLE_GENERATIVE_AI_API_KEY`, primary model |
| NVIDIA key | `NVIDIA_API_KEY`, fallback model |
| Optional: Ollama | Only for the Privacy Vault (local health analysis). Default model `deepseek-r1:8b` |

Both keys are configured in `.env.local`, so all AI features run live. For an offline demo, `NEXT_PUBLIC_DEMO_MODE=true` makes the app skip every model call.

### Stack

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4 (tokens as CSS variables), Prisma 7, Vercel AI SDK v6 (`ai`), `@ai-sdk/google`, `@ai-sdk/openai` (used for NVIDIA and Ollama), Zustand 5, Framer Motion, Recharts, Zod 4, date-fns, Sonner, lucide-react. A hand-written WebGL2 shader draws the load visual (no three.js). `d3`, `@types/d3` and `swr` are installed but unused or barely used.

### Commands (run from `bayt/`)

```bash
npm install
cp .env.local.example .env.local      # fill in keys; also keep DATABASE_URL in .env
npx prisma migrate deploy             # create the schema
npm run seed                          # wipes and reseeds, dates relative to today
npm run dev                           # http://localhost:3000 (Turbopack)
npm run build                         # production build
npm run lint
npx tsc --noEmit
npx prisma studio
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./dev.db`. Must be in `.env` too, because the Prisma CLI reads only `.env` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini key. The SDK reads it by this exact name |
| `NVIDIA_API_KEY` | NVIDIA build key for the fallback model |
| `NVIDIA_MODEL` | Fallback model id. Default `nvidia/nemotron-3-super-120b-a12b`. NVIDIA retires models without notice (the old default returned `410 Gone`), so check build.nvidia.com |
| `PRIVACY_VAULT_ENABLED` | Default for the vault only. Once toggled in the app, the stored setting wins |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local model for the vault. Defaults `http://localhost:11434/v1`, `deepseek-r1:8b` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = no model calls. All deterministic code still runs on the seeded database |
| `NEXT_DIST_DIR` | Optional. Separate Next build dir so a verification run does not clobber a live `.next` |

`lib/env.ts` checks these once per server process and logs exactly which are missing. It never throws: the app must boot without keys.

## 3. AI layer: Gemini and NVIDIA

Both providers are wired in and work through one code path, so no feature needs provider-specific code.

| Model | Role | File | Needs |
|---|---|---|---|
| `gemini-2.5-flash` (`geminiFlash`) | Primary for every structured call | `lib/ai/client.ts` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `gemini-2.5-pro` (`geminiPro`) | Exported for heavier reasoning (not used by a current feature) | `lib/ai/client.ts` | same |
| NVIDIA Nemotron (`fallbackModel`) | Automatic fallback, text only | `lib/ai/client.ts` | `NVIDIA_API_KEY` |
| Ollama (`ollamaHealth`) | Privacy Vault, local health analysis | `lib/ai/ollama.ts` | Ollama running locally |

### How the two models work together

Every model call goes through `safeGenerateObject()` in `lib/ai/safe-generate.ts`:

1. Calls the primary model with a timeout (default 45 s).
2. On a rate limit, quota, auth error (401/403/429/503), missing key or overload, it **fails over to NVIDIA** with its own timeout (default 60 s).
3. Schema or validation errors do not fail over: the same prompt would fail the same way.
4. It never throws. It returns `{ ok: true, data }` or `{ ok: false, error }`.
5. `failover: false` turns the fallback off for data that must never leave the machine (the Privacy Vault) and for file input (the fallback model is text-only).
6. It logs token usage per call.

NVIDIA specifics (`lib/ai/client.ts`):
- Uses `nvidia.chat(...)`, because the OpenAI provider's default call routes to `/v1/responses`, which NVIDIA does not support. `.chat()` forces `/v1/chat/completions`.
- A custom `fetch` wrapper injects `chat_template_kwargs.enable_thinking = false` for Nemotron. The SDK drops unknown provider options, and without the switch Nemotron spent about 4,500 of 6,000 tokens "thinking" and cut its JSON off mid-string.

### Configuration

- **Gemini** (`GOOGLE_GENERATIVE_AI_API_KEY`) and **NVIDIA** (`NVIDIA_API_KEY`) are both set in `.env.local`. Gemini answers every call. NVIDIA steps in only when Gemini is rate-limited, over quota or overloaded.
- PDF and image upload in the inbox is read by Gemini (multimodal) and has no fallback, because the NVIDIA model is text-only. Pasted text and text files use Gemini, with NVIDIA as backup.
- Keep the keys out of git (`.env*` is gitignored) and rotate any key that has been committed.

## 4. Design principles

1. **Code decides, the model writes.** Load, conflicts, priorities, meal compliance, drift and resilience are computed deterministically. Models only phrase things and write drafts, and every output is validated or guarded before it is shown.
2. **Consent.** Bayt proposes; a person accepts. Nothing changes who does what until the recipient says yes.
3. **Privacy by design.** Models receive abstract constraints and hours, never diagnoses or medication names (the Health agent is the exception, and it goes local-only when the vault is on).
4. **Honest numbers.** Every figure comes from a documented table. Planning assumptions are labelled as such. A score is "x/100"; a share is a computed %.
5. **Honest status.** "Preview" appears only when a model really failed. Demo mode says "Demo". Simulated figures say "Simulated".
6. **No names as keys.** Members are matched by id or role, never by name. Internal ids (`mem_*`) never reach the UI. No gendered pronouns in generated text (member records carry no gender).

## 5. Features, page by page

### 5.1 Landing page `/`
- **What:** public front page. Hero headline, a sample household drawn by the same load visual, and what/how/privacy sections.
- **How:** server component `app/page.tsx`; `components/landing/LandingField.tsx` feeds fixed sample figures (labelled "A sample household") into `LoadFieldLazy`. Anchor nav links work (`#what`, `#how`, `#privacy`).
- **Use:** "Open Bayt" goes to `/briefing`; "Set up your household" goes to `/onboarding`.
- **Needs:** nothing (no database).

### 5.2 Onboarding `/onboarding`
- **What:** three honest steps: "Your household" (real members from the database), "What Bayt reads" (calendar and records, documents you drop in, nothing else), "Ready" (real counts of people, events in the next 7 days, open tasks).
- **How:** client page fetching `/api/family`. States loading and failure.
- **Needs:** a seeded database.

### 5.3 Briefing `/briefing` (hero page)
One calm column, written for the member chosen in "Viewing as":
- **Greeting and date.**
- **Load field + consent inbox.** A compact load visual and the handoff requests waiting on this member.
- **Today's priority** (`PriorityHero`): one sentence naming a person, a time and a consequence; a "Why?" popover with the evidence; up to three other items.
- **Time given back** (`TimeBack`): one computed Time Dividend number (hours of coordination Bayt took off the family this week), framed with a Memory Vault quote, a "Capture a memory" box and "How this is counted".
- **Time together** (`MicroActions`): up to two small connection actions from the stored Connection run.
- **How:** `GET /api/briefing` returns the stored briefing plus a live overlay (load, priority, memory of the day recomputed on every request so a handoff or new memory shows at once). `GET /api/briefing/member/[memberId]` returns the per-member wording. Components: `PriorityHero`, `TimeBack`, `MicroActions`, `MemoryComposer`, `HandoffInbox`.
- **Persona by member** (`adaptive-briefing.ts`): grandparent gets simple, warm language with reminders first; child under 13 gets very short encouraging sentences; teenager gets a friendly peer tone; the parent carrying the most load (score 50+) gets a supportive tone; other parents get a direct logistics-first tone. Persona comes from role, age and load, never from a first name.
- **Use:** open the page; switch "Viewing as" in the top bar to see another member's briefing.
- **Needs:** seeded database. In demo mode the first visit composes a briefing with no model.

### 5.4 Load `/load` (replaces `/caregiver`, which redirects here)
- **Who carries what:** large interactive load field (each member a glowing body sized and heated by their load score) plus a per-member list with hours, score, share and a "Why?" popover listing the records behind the number.
- **Burnout line:** members at or above 75/100 are flagged, with days since a rest block.
- **Handoff inbox** for the "Viewing as" member.
- **Resilience Mode** (the centrepiece), described in section 6.2. Click a body to choose who is away.
- **Needs:** seeded database. The stress test needs no model.

### 5.5 Operations `/operations`
- **Drop anything** (inbox): drop a PDF, image or text file, or paste text. Described in section 6.4.
- **The week's meals** (`MealPlanGrid`): 7 days x breakfast/lunch/dinner. Each dish shows member dots for who it suits. A dialog lists who it suits and what the others get instead.
- **Family agenda** (`FamilyAgenda`): the week's calendar, with an "Add event" modal that flags any new clash.
- **Conflicts** (`CalendarConflicts`): clashes with names (not ids), a suggested fix, and a "Why?" popover.
- **Emails and school notes** (collapsed): `SchoolAdminDrafts` (emails to the school) and `SchoolHealthBriefs` (health notes for school). Each has copy-text. **Bayt never sends anything**: you copy the text and send it yourself.
- **`/operations/meal-plan`:** the full meal plan page. No name matching and no hard-coded profile counts.
- **How:** `POST /api/agents/operations` via the Operations agent (section 8).
- **Needs:** seeded database. Meals and drafts are written by Gemini (NVIDIA as backup). Only if both models fail is the built-in Emirati plan used and marked Preview (Demo in demo mode).

### 5.6 Health `/health` and `/health/[memberId]`
- **Overview:** everyone with a status word (good / monitor / alert) from labs and risk flags, never colour alone; appointments in the next 21 days (who it is for and who takes them); medications with giver and backup ("No one else can give it" in ember when no backup exists); family patterns (for example a shared out-of-range lab).
- **Member page:** risk flags, medications (`MedicationList`), lab results (`LabResultsTable`), patterns (`FamilyPatterns`) and a wearable block labelled "Simulated sample figures".
- **How:** `POST /api/agents/health`. With the Privacy Vault on, analysis runs on the local Ollama model (cloud failover disabled). If Ollama is offline, Bayt computes summaries locally (`lib/health/patterns.ts`) and sends nothing to the cloud.
- **Removed on purpose:** numeric "Health Twin" projections, the D3 health network, invented waveform charts, "confidence %", fake sync times.
- **Not medical advice.** The prompt tells the model to recommend asking the relevant clinician.

### 5.7 Settings `/settings`
- **People:** edit a member (name, age, role, dietary needs, preferences, conditions, risk flags, medications) or add someone. Changes persist through `PUT/POST /api/family/members`.
- **Privacy Vault toggle:** persisted in the `Setting` table via `/api/privacy/status`. Shows a warning if the vault is on and the local model is not running.
- **Privacy statements:** meal plans and the load summary are written without diagnoses or medication names; calendar titles and dropped documents can reach the AI model that reads them; everything is stored in a database on this computer.
- **Today's season:** active seasons (Ramadan, dust season, summer heat, exam period, school holiday) and upcoming events.

### 5.8 Redirects
`/caregiver` redirects to `/load`. `/connection` redirects to `/briefing` (its content became the micro-actions and Memory Vault on the Briefing).

## 6. Features that cut across pages

### 6.1 Load model and Invisible Hours
- **What:** how many hours of unpaid household coordination each person carries in the next 7 days.
- **How:** `lib/load/model.ts` `computeLoad()` is the single source of truth. Rules: an event counts only if someone owns it; a medication counts only if given by someone other than the patient; an open obligation always counts for its owner; one-offs count once they enter their lead window; recurring ones count by occurrences per week. Hours come from the reference table (`lib/load/reference-durations.ts`), for example school run 35 min, appointment escort 120 min, renewal 150 min, medication dose 5 min, meal planning 90 min. These are labelled **planning assumptions**.
- **Outputs per member:** hours, score 0-100 (hours / 20 h weekly capacity), share of family load %, hours by category (medical, school, admin, logistics, meals, social), days without rest (capped at 30).
- **Constants:** `WEEKLY_CAPACITY_HOURS = 20`, `BURNOUT_THRESHOLD = 75`, `BASELINE_WEEKLY_HOURS = 12`.
- **Effect:** a care recipient who owns nothing carries little, however much care they need. Every screen reads this one model, so two pages can never show different numbers.

### 6.2 Resilience Mode (stress test and handover)
- **What:** "what breaks if this person is not here?"
- **Use:** on `/load`, click a member's body (or pick them), choose 1 to 60 days, run the test.
- **Bus factor** (`assessResilience`): the fewest people any job depends on, overall and per category, with single points of failure listed.
- **Stress test** (`simulateAbsence`): walks every day of the absence, finds each event, obligation and medication occurrence that falls to the absent person, and sorts them into "a named backup steps in" (cover) and "nobody can do it" (failure). Failures carry a severity (medication critical, obligation high, event medium), the first day they fail, hours of work needed, and a consequence. As-needed medication (EpiPen) fails from day one. Repeated jobs are grouped. It also shows what the backups' load becomes (before and after) and warns when covering would push someone over the line. A note appears when the calendar does not reach the whole period.
- **Handover plan** (`buildHandoverPlan`): code picks who (the lowest-loaded present parent who stays under the burnout line; an event's subject cannot cover it) and writes deterministic runbook steps. Anything nobody can take is flagged "needs someone outside the family". Each placement becomes a **pending handoff**.
- **Model wording** (`rewordRunbooks`): optional, one model call. Clinical items are described generically before they reach the model. Output for an entry is dropped if it adds a number, uses a gendered pronoun, or is not about a requested task. Skipped in demo mode.
- **Consent loop:** switch "Viewing as" to the recipient, accept, and the test re-runs with before/after (the baseline is kept in a store).
- **API:** `POST /api/resilience {absentId, days, withPlan?}`. The stress test is instant and model-free.
- **Seed effect:** Fatima owns tasks with no backup (Aisha's weekly dose, EpiPen, school fees, meal planning), so a 14-day test on Fatima finds real failures.

### 6.3 Handoffs: consent-based redistribution
- **Propose:** `lib/handoffs/propose.ts` finds the top-loaded member over the burnout line and proposes up to 3 tasks (ideal size 0.4-3.1 h) to receivers who stay under the line and lighter than the sender. A named backup is preferred; otherwise any other parent.
- **Respond:** `PATCH /api/handoffs/[id] {action: accept | decline | redirect, redirectToId?}`.
  - *Accept:* the owner changes, and the previous owner becomes a backup, so the task now has two people.
  - *Decline:* nothing changes; the item is not re-proposed for 3 days.
  - *Redirect* ("Suggest someone else"): the original is closed and a fresh pending request goes to the suggested person, who must also accept.
- **UI:** `HandoffInbox` (Accept / Not now / Suggest someone else). Accepting animates a flow of light between the two bodies in the load field (skipped under reduced motion).
- **Safety:** pending asks count as if accepted when proposing more, so repeated runs never stack requests.

### 6.4 Drop-anything inbox
- **What:** turn a document into tasks and events, with a person confirming everything.
- **Use:** in Operations, drop a PDF/PNG/JPG/WebP/text file (max 8 MB) or paste text. Review the proposed items (each shows the exact quoted words and "counted as about N minutes"), edit title/date/owner, choose an owner, then Save.
- **How:** `POST /api/inbox` reads and proposes only, and saves nothing. `POST /api/inbox/confirm` re-validates everything and saves `Obligation`s (`sourceType: 'inbox'`) or `CalendarEvent`s, then re-detects conflicts. Code in `lib/ingest/`: an adapter turns the upload into an input (the interface also fits email or calendar feeds later); one extractor reads any input.
- **Code decides:** members reach the model as aliases (m1, m2), never ids. Dates are read by code first (`findDate`, dd/mm/yyyy). For text, an item whose quote is not found in the text is dropped. Task type and obligation-vs-event are corrected by keyword rules (the fallback model had misfiled fees as events). Dates must be real and within -30 to +800 days. Up to 8 candidates per document, 12 per confirm.
- **Models:** files use Gemini only (`failover: false`, multimodal). Text uses Gemini, or NVIDIA if Gemini is down. In demo mode only a built-in date reader runs on pasted text. If the model fails on text, the date reader is used and the screen says so.
- **Privacy notice on screen:** the file or text goes to an AI model and is not kept.
- **Not yet exercised end to end:** PDF/image upload and the drag-and-drop gesture.

### 6.5 Evidence trail ("Why?")
- **What:** a "Why?" popover (`components/ui/WhyPopover.tsx`) on priorities, conflicts and load rows showing the real records behind a statement, with titles, dates and owners.
- **How:** `POST /api/sources {sources: [{type, id}]}` resolves ids and **drops ids that do not exist**, so an invented id can never show a made-up source. Medications show "Medication schedule" (never the drug name).

### 6.6 Memory Vault
- **What:** quotes the family captured. The model never writes or edits a quote.
- **Use:** "Capture a memory" on the Briefing: type 3-280 characters and choose who said it.
- **How:** `GET/POST /api/memories`. The briefing picks the "memory of the day" live: a memory captured today wins, otherwise the vault rotates by day. Seed quotes are labelled as samples.

### 6.7 Viewing as
A global perspective switcher in the top bar. It persists in the browser (`bayt-viewing-as`). Default is the member carrying the most load. Every page reads it, so handoffs can be demonstrated anywhere.

### 6.8 System pill and Privacy Vault
- **System pill** (top bar): one pill with an honest summary (Demo, Working, Preview, Live, Ready). Its popover lists each agent's status (Operations, Health, Connection, Load), the vault row with a switch, and the data source.
- **Privacy Vault:** on = health analysis on a local Ollama model and never the cloud. If Ollama is offline, health AI is paused and Bayt computes summaries itself. Status endpoint: `disabled` (cloud), `active`, or `offline`. It is **fail-closed**: if the setting cannot be read, the vault is treated as ON. The setting persists across restarts.

### 6.9 Cultural and seasonal awareness
- **What:** the app adjusts meals and wording for Ramadan (suhoor/iftar), Eid, Gulf dust season (1 Oct-30 Nov), summer heat (1 Jun-15 Sep), UAE school terms and exam periods, and UAE National Day.
- **How:** `lib/utils/cultural-context.ts` reads a dated table (`lib/data/cultural-calendar.ts`, covers 2026-2027, extend yearly). Islamic dates carry a ±3 day moon-sighting uncertainty; school terms are approximate. Respiratory members are read from member data (never hard-coded), so the dust-season note names whoever actually has asthma.
- **Effects:** meal planning mode (Ramadan prefixes "Suhoor:" / "Iftar:" and tags); drift threshold doubled during Ramadan/Eid; softer connection wording; dust and heat health notes; the top-bar badge ("Ramadan Mode", "Dust Season", ...) with an explanatory popover; a school brief for asthma during or just before dust season.
- **Status:** `calendarCovered` is false past 31 Dec 2027.

### 6.10 Meals: Emirati and diet-safe
- **Constraints** (`lib/meals/constraints.ts`): dietary needs and conditions become abstract constraints (vegetarian, nut-free, gluten-free, low-sodium, low-glycemic, soft texture). Diagnoses never leave this module.
- **Generation:** the model writes a 7-day Gulf/Emirati plan from constraints only, with a full ingredient list per dish; no dish repeats; halal only.
- **Validation** (`lib/meals/validate.ts`): in code, every dish is checked against every member by word-boundary keyword matching (ignoring explicit "X-free" labels). Non-halal dishes are replaced. `suitableFor` is recomputed (the model's own list is ignored). Each excluded member gets a named, rotating substitute from the Emirati library. The result is checked so everyone is covered.
- **Fallback:** a hand-written, varied, compliant plan (`lib/meals/fallback-plan.ts`, with a Ramadan variant).

### 6.11 Calendar conflicts
- **What:** detects clashes (flagged by the family, or inferred when the same responsible person has two events within 60 minutes) over the next 8 days, finds a free listed backup, and suggests a fix in plain language.
- **How:** `lib/ops/conflicts.ts`. Adding an event via `POST /api/family/events` re-detects clashes and flags both events (`markDetectedConflicts`). Conflicts feed the priority ranking, the Operations page, school email drafts and the Time Dividend.

### 6.12 Priority ranking
`lib/briefing/rank.ts` ranks conflicts, obligations, handoffs and burnout by severity x urgency x category weight (+ no-backup bonus). "Today's priority" is always the top item. Daily/weekly routines are load, never "the priority". Generic text ("review your schedule") is rejected.

### 6.13 Connection and drift
- **What:** gentle nudges for family members who have not shared time.
- **How:** `lib/connection/drift.ts` computes days since two members shared a calendar event (same activity on both calendars the same day, or one escorting the other) over 30 days. It states only what the calendar shows, never anything about conversations or feelings. The threshold is 7 days (14 in Ramadan/Eid). The next free evening (after 17:00) for both is found. The model only words the suggestion and micro-action, keyed by pair number.
- **Where it shows:** micro-actions on the Briefing.

### 6.14 Time Dividend
Hours of coordination Bayt took off the family this week: clashes spotted (30 min each), weekly meal plan (90), school drafts (12 each), handoffs arranged (20 each), over the last 7 days. Shown as one number with a "How this is counted" breakdown.

### 6.15 School health briefs (local only)
Template-based notes filled from the parent's own data, never sent to a model: severe nut allergy protocol (mentions an expiring auto-injector if there is a matching obligation), ADHD scheduling suggestion (when a stimulant is on the medication list), and asthma dust-day precautions (in or within 30 days of dust season). Each has an urgency (urgent, routine, seasonal) and a validity date. School name is a `[School name]` placeholder.

### 6.16 Load field visual (WebGL2)
- **What:** each member is a soft glowing body sized and heated by their load score (ember when overloaded). Flows animate a handoff. The absent member cools and fractures; sparks mark people who inherit or lose tasks. Hover highlights.
- **How:** `components/visual/LoadField.tsx` (always import `LoadFieldLazy`; dynamic, no SSR), GLSL in `components/visual/shaders/loadField.frag.ts`, GL plumbing in `lib/gl/`. Device pixel ratio capped at 1.5; pauses when off-screen or the tab is hidden; survives context loss.
- **Fallbacks:** no WebGL2 gives a CSS gradient at the same positions; reduced motion gives a single still frame. Labels stay in HTML, and the canvas has an `aria-label` summarising the load.

### 6.17 Data freshness (demo-friendly)
The seed is relative to today. `ensureFreshSeed()` re-anchors seeded events, obligations, memories and wearable timestamps when the day changes and re-applies accepted event handoffs, so the demo never looks stale. User-created rows are untouched.

### 6.18 Agent run caching
Each agent result is stored as an `AgentRun`. A same-day run (under 12 h old) is served unless `{force: true}`, so opening a page never burns quota. `isFallback` is the only source of the "Preview" state. A 500 means a real bug, never disguised sample data.

### 6.19 Accessibility and motion
Global `prefers-reduced-motion` handling and `useMotionOK()`; visible focus rings; skip link on the landing page; `aria-label`s on canvases and controls; status never shown by colour alone; Arabic font (IBM Plex Sans Arabic) loaded for `:lang(ar)`.

### 6.20 Design system
"Desert dusk" tokens in `app/globals.css`: `--bg`, `--surface`, `--surface-raised`, `--surface-high`, `--ink`, `--ink-muted`, `--sand`, `--on-sand`, `--ember`, `--ember-soft`, `--palm`, `--dusk`, `--line`, `--line-strong`. Fonts: Fraunces (display), Inter (body), JetBrains Mono (numerals only, `.num`), IBM Plex Sans Arabic. One member palette (`lib/design/members.ts`), assigned by position, never by name. Rules: one hero number per screen, no repeated numbers, no decorative widgets, detail behind "Why?".

## 7. Deterministic engine (`lib/`)

| Module | Job |
|---|---|
| `time/today.ts` | `getToday()`, the one place "now" comes from; `at()`, `daysBetween()` |
| `load/reference-durations.ts` | Minutes per task type, capacity and burnout constants |
| `load/model.ts` | `computeLoad()`, `dosesPerWeek()`, `eventTaskType()`, `daysSinceRest()` |
| `load/time-dividend.ts` | Time Dividend |
| `load/field-layout.ts` | Positions, radii and aria text for the load visual |
| `briefing/rank.ts`, `briefing/compose.ts` | Ranked priorities and the deterministic briefing |
| `ops/conflicts.ts`, `conflicts-db.ts` | Conflict detection and persistence of flags |
| `ops/school-briefs.ts` | Template school health notes |
| `meals/constraints.ts`, `library.ts`, `validate.ts`, `fallback-plan.ts` | Diet rules, Emirati meal pool, validator, built-in plan |
| `connection/drift.ts` | Drift from shared calendar events, next free evening |
| `handoffs/propose.ts`, `handoffs/store.ts` | Proposals and consent state changes |
| `resilience/simulate.ts`, `resilience/plan.ts` | Stress test, bus factor, handover plan, guarded rewording |
| `health/patterns.ts` | Local, model-free health summaries |
| `ingest/*` | Inbox adapter, types and extractor |
| `evidence/resolve.ts` | Resolve source refs, dropping unknown ids |
| `utils/cultural-context.ts`, `data/cultural-calendar.ts` | Seasons, Ramadan, Eid, school terms |
| `utils/invisible-hours.ts` | View of the load model for category cards |
| `ai/guards.ts` | `isFaithfulRewrite`, `isFaithfulNarrative`, `keepsNumbers`, `addsNoNumbers` |
| `data/refresh.ts`, `seed.ts`, `mock-family.ts` | Relative-date seed and re-anchoring |

**Faithfulness guards** (`lib/ai/guards.ts`): a model's rewrite is accepted only if it keeps every number from the original, adds no new number, and does not grow beyond 1.5x + 30 characters. Narrative text is also rejected if it uses comparisons the code did not compute ("double", "triple", "half"...). Otherwise the deterministic text is kept.

## 8. Agents

Each returns `{output, isFallback, error?}` and is cached per day.

| Agent | Deterministic part | Model part |
|---|---|---|
| **Operations** | Conflicts, school health briefs, meal validation | 7-day meal plan from constraints; school email drafts from event titles and names (never conditions) |
| **Caregiver (Load)** | All numbers, proposals, which members are at risk | A short narrative, accepted only if it adds no figure or comparison. Gets hours per category and names only |
| **Connection** | Drift, evidence, free evenings, Memory Vault | Warm wording for each pair (keyed by pair number). Never writes quotes |
| **Health** | Local summaries and shared-lab patterns | Cross-family patterns (cloud or local Ollama under the vault). Unknown member ids are dropped |
| **Adaptive briefing** | Ranked items, persona, "one action" | Greeting and rephrasing, guarded |
| **Orchestrator** | Runs the four agents in parallel, composes the briefing from ranked items, creates pending handoffs | Optional wording pass (skipped for health text when the vault is on, and in demo mode). Never throws on model failure |

## 9. API reference

| Route | Method | Purpose |
|---|---|---|
| `/api/family` | GET | Whole family graph (members, health, meds, events, obligations, handoffs). Runs `ensureFreshSeed` first |
| `/api/family/members` | POST | Add a member |
| `/api/family/members/[id]` | GET, PUT | Read, or update a member (fields, health profile, replace medications) |
| `/api/family/events` | POST, DELETE | Add an event (flags new clashes); delete by `?id=` |
| `/api/briefing` | GET | Stored briefing plus a live overlay |
| `/api/briefing/generate` | POST | Generate (`?force=true` to re-run). Cached for 12 h |
| `/api/briefing/member/[memberId]` | GET | Per-member briefing (cached by a ranking fingerprint) |
| `/api/agents/{operations,health,connection,caregiver}` | POST | Run or serve an agent (`{force?}`) |
| `/api/load` | GET | Records behind each member's number, for "Why?" |
| `/api/resilience` | POST | Stress test, optionally with handover plan and pending handoffs |
| `/api/handoffs` | GET | Inbox, filtered by `toId` and `status` |
| `/api/handoffs/[id]` | PATCH | `accept`, `decline` or `redirect` |
| `/api/inbox` | POST | Multipart: read a document, return candidates, save nothing |
| `/api/inbox/confirm` | POST | Validate and save reviewed items |
| `/api/memories` | GET, POST | Memory Vault |
| `/api/sources` | POST | Resolve evidence refs |
| `/api/privacy/status` | GET, POST | Read, or toggle, the Privacy Vault |

## 10. Data model (Prisma, SQLite)

`Family` (surname only) -> `FamilyMember` (given name only, role parent/child/grandparent, age, dietary needs, preferences) -> `HealthProfile` (conditions, labs, wearable, risk flags), `Medication` and `CalendarEvent` (both with `ownerId` and `backupIds`; events also `recurrence`), `Obligation` (title, category, taskType, dueDate, recurrence, owner, backups, subject, consequence, leadTimeDays, status, sourceType), `Handoff` (from, to, item, reason, status, redirect), `Memory`, `AgentRun`, `Setting` (key/value: vault, seed anchor), `Briefing`. `MealPlan` and `Meal` exist but are unused (meal plans live in `AgentRun`). JSON columns are strings: `JSON.stringify` on write, parsed in `lib/db/queries.ts`. Seeded ids use prefixes `evt_`, `obl_`, `memo_`; user-created rows use cuids.

## 11. Demo family and seed data

- **Members:** Salem (type 2 diabetes, hypertension; low-sodium, low-glycemic), Fatima (iron and vitamin D deficiency, gluten sensitivity; gluten-free), Layla (mild asthma, vitamin D; vegetarian), Khalid (ADHD, severe nut allergy), Aisha (osteoporosis, hypertension, mild cognitive decline; soft, low-sodium).
- **Calendar:** a realistic week from -16 to +14 days, including a clash today (contractor visit vs parent-teacher conference), physio vs dentist, school pickups split between Fatima and Salem, a trip day for Salem.
- **Obligations:** residence visa, Emirates ID, Ejari, Mulkiya, DEWA, Salik, health insurance, school fees, Khalid's allergy plan, EpiPen replacement, Layla's inhaler, weekday dinners, weekly meal planning. Several owned by Fatima with no backup, on purpose.
- **Reset:** `npm run seed` wipes and reseeds. Resetting the real `dev.db` needs `npx prisma migrate reset --force` then `npm run seed` (it is still on the old schema; the user must approve).

## 12. Planned features

### Phase 5: culture, demo and accessibility (built)
1. **Date simulator.** Demo mode only. A "Simulate date" control in the top bar (`DateSimulator`) offers presets for Ramadan (12 Feb 2027), Eid al-Adha (14 May 2027), summer heat (15 Jul 2027) and dust season (5 Nov 2026), plus a date picker and "Back to today". It POSTs to `/api/sim`, which holds the override in the server process, and reloads. `getToday()` in `lib/time/today.ts` returns the override, and `SimDateGate` applies it in the browser before anything renders, so server and client agree. Saved briefings are dated with `getToday()`. Seeded events stay anchored to the real date, so a simulated date changes the season, meals, load window and cultural banner rather than the event list.
2. **Arabic read-aloud.** A grandparent's briefing carries `textAr`, a Gemini translation of the greeting and today's priority, accepted only if it adds no figure that is not in the English source. `ReadAloud` speaks it with `speechSynthesis` using the first `ar-*` voice and is hidden when the browser has none.

### Loading states (built)
The briefing's waiting state is a sliding bar (`components/ui/SlideLoader.tsx`) instead of a spinner. `NavProgress` (root layout) shows a sliding bar across the top from the click on any internal link, such as "Open Bayt" or a sidebar section, until the new page arrives. `app/(dashboard)/loading.tsx` shows the same loader in the page area while a route loads. With reduced motion the bar is static.

### Phase 6: tests and docs (built, except where noted)
3. **Vitest.** Add `vitest`, `vitest.config.ts` with the `@/` alias and an `npm test` script. Unit tests for: `computeLoad`, `simulateAbsence` and bus factor (`simulate.ts`), `plan.ts`, `ingest/extract.ts` `findDate`, the meals validator and constraint mapper, cultural context on fixed dates (Ramadan, Eid, dust season), Invisible Hours, Time Dividend, priority ranking, the env check. No test runner is installed today.
4. **README.** Setup, environment, demo mode, privacy-by-design (the constraint mapper and fail-closed vault). The current `README.md` is the create-next-app default.
5. **Diagrams.** A Mermaid architecture diagram and an orchestrator sequence diagram showing parallel agents with per-agent fallbacks, 429/auth failover to NVIDIA, typed results and the fail-closed vault.
6. **Rewrite the parent `D:\Projects\Coding\Bayt\CLAUDE.md`** (stale) to match `bayt/CLAUDE.md`.

### Cleanup and small improvements
7. Done for `invisibleHours`. `alerts` is still returned because the type requires it.
8. Done: the Health agent no longer asks the model for `crossLinks`.
9. Done: `d3` and `@types/d3` removed.
10. Remove or use the `Meal` and `MealPlan` tables.
11. Extend the cultural calendar beyond 2027.

### Already designed for, not built
- **More inbox sources.** The adapter interface (`IngestAdapter`) is written so email or calendar feeds can be added without changing the extractor.
- **Persisting generated meal plans** to `MealPlan`/`Meal` (the original plan item; currently plans live in `AgentRun`).

### Explicitly out of scope
Chat scanning, scraping portals with credentials, a baby tracker, a subscription tracker, and a three.js dependency.

### Waiting on the user (not done without approval)
Resetting the real `dev.db`; rotating the NVIDIA and Stitch keys; committing (nothing from Phases 0-4 is committed, and `.env`/`.env.local` show as staged deletions, which is the intended untracking).

## 13. Known gaps and untested paths

- Not yet exercised end to end: PDF/image inbox and the live runbook rewording. The NVIDIA fallback path has been run with real calls.
- Not checked in a browser: the load visual's shader (the automation tab reports hidden, so it pauses), other "Viewing as" members (for example Aisha's larger type), Arabic text, `/operations/meal-plan`, the drag-and-drop gesture.
- Wearable figures (heart rate, sleep, steps) are simulated seed numbers and are labelled so.
- Cultural calendar: school terms are approximate and Eid dates carry ±3 days.
- No automated tests yet (Phase 6).
- The real `dev.db` is on the old schema; use a scratch database for verification.

### Verification recipe (scratch DB, no keys needed)
```bash
export DATABASE_URL="file:<scratch>/x.db" NEXT_PUBLIC_DEMO_MODE=true NEXT_DIST_DIR=.next-verify
npx prisma migrate deploy && npx tsx lib/data/seed.ts
npx next dev --turbopack -p 3102
```
Then open `/load`, run a 14-day stress test on Fatima, draft the plan, switch "Viewing as" to Salem and accept one. Re-seed to reset. If `next dev` returns 500 with `ENOENT ..._buildManifest.js.tmp`, an earlier server is still alive on the same port and dist dir: stop it, delete the dist dir and start once.
