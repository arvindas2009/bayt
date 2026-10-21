# Bayt — Project Summary

> **Bayt** (Arabic for "home") is an AI-powered **family operating system**: a Next.js dashboard where four specialised AI agents quietly read a family's calendars, health data and routines, then boil it all down into one 30-second daily briefing.

This summary was written from the code as it stands, not from the older docs. Where the older docs (`CLAUDE.md`, `GEMINI.md`, `bayt-analysis-report.txt`, `structure.txt`) disagree with the code, the code wins. See [Where the existing docs are out of date](#where-the-existing-docs-are-out-of-date).

---

## 1. What it is

### The idea
Running a family is three jobs disguised as one, and the mental load usually lands on one person:

| Problem | What it looks like |
|---|---|
| **Operations** | Meals for conflicting diets, schedule clashes, school emails |
| **Health** | Cross-generational care; patterns no single doctor sees |
| **Connection** | Relationships eroding under the weight of the first two |

Bayt is designed as a passive system, not a chat app. The family is meant to read a single briefing while the agents do the work in the background. The pitch metric is the **Time Dividend**: hours of mental labour handed back per week.

### The demo family
Everything is demonstrated on a fictional Gulf (UAE) family, seeded into SQLite:

| Member | Role | Age | Notable data |
|---|---|---|---|
| Salem | Parent | 45 | Type 2 diabetes (Metformin), low-sodium/low-glycemic diet |
| Fatima | Parent | 42 | Iron-deficiency anaemia, Vitamin D deficiency, anxiety; the overloaded primary caregiver |
| Layla | Child | 16 | Mild asthma (Albuterol), Vitamin D deficiency, exam stress; vegetarian |
| Khalid | Child | 12 | ADHD (Methylphenidate), severe nut allergy (EpiPen) |
| Aisha | Grandparent | 71 | Osteoporosis, hypertension, mild cognitive decline (Alendronate, Lisinopril) |

The seed data and some agent prompts refer to the family as "Al-Salem", while the member records use the surname "Al-Mazrouei".

---

## 2. The four agents

All agents live in `lib/agents/` and return Zod-validated structured output through one shared wrapper (see [AI layer](#ai-layer)).

| Agent | File | Model | What it produces |
|---|---|---|---|
| **Operations** | `operations-agent.ts` | Gemini 2.5 Flash | 7-day meal plan respecting every member's dietary needs, calendar conflicts with suggested fixes, school email drafts, "school health briefs" (e.g. a PE advisory for an asthmatic child before dust season), and `timeSavedHours` |
| **Health** | `health-agent.ts` | Gemini 2.5 Flash, or local Ollama in Privacy Vault mode | 3–5 **family-level** patterns (shared deficiencies, medication-interaction risks, cardiovascular chains), a per-member status summary, `crossLinks` that feed the network graph, and **Health Twins** (15-year risk projections, with and without the interventions Bayt has already applied) |
| **Connection** | `connection-agent.ts` | NVIDIA Nemotron Nano 30B | Relationship **drift alerts**, timed micro-actions (quick / medium / invest), a Memory Vault of family quotes, and a 0–100 `syncScore`. A separate `/repair` endpoint (Gemini) generates a 4-step, 7-day repair protocol for a drifting pair |
| **Caregiver** | `caregiver-agent.ts` | NVIDIA Nemotron Nano 30B | Load score per member, a burnout **threshold of 75/100**, the at-risk member with days without rest, auto-interventions (personal time, logistical load, medical coordination) and a 5-category load breakdown (Meals, Medical, School Admin, Social, Emotional) |

### The orchestrator (`lib/agents/orchestrator.ts`)
`runOrchestrator(familyId)` is the brain behind the hero page:

1. Loads the whole family graph from Prisma.
2. Runs all four agents **in parallel** (`Promise.all`). Each has a `.catch` that falls back to empty output or pre-baked mock data, so one failure never kills the briefing.
3. If the Privacy Vault is on, redacts the health output (see below).
4. Feeds everything into a "Briefing Composer" prompt on Gemini Flash, which returns a 2-sentence summary, 4–6 ranked insights and 1–4 actionable alerts.
5. Adds a random "memory of the day" and a daily time-saved breakdown, then persists the result to the `Briefing` table.

### Adaptive per-member briefings (`adaptive-briefing.ts`)
Each person gets the same facts in a different voice. Salem gets an authoritative, logistics-first tone. Fatima gets a supportive tone built around her caregiver load. Layla gets a peer-like tone with no alarming health data. Khalid gets very simple language. Aisha gets simple, warm language that leads with medication reminders. If generation fails, a deterministic fallback is used.

### Cultural intelligence (`lib/utils/cultural-context.ts`, `lib/data/cultural-calendar.ts`)
A rule-based layer, not an LLM, injected into every agent prompt. It knows about:

- Ramadan and both Eids, with moon-sighting uncertainty of ±3 days
- Gulf dust season (Oct–Nov) and summer heat (Jun–mid Sep)
- UAE school terms and exam periods

It switches meal planning into Ramadan/iftar/suhoor modes, raises health overrides such as dust-season asthma advice, and tells the Connection agent to soften drift alerts during Eid/Ramadan, when gatherings are expected.

### Computed (non-LLM) metrics
- **Invisible Hours** (`invisible-hours.ts`): converts the week's calendar events and medications into hours of hidden admin labour (medical, school, logistics, conflict resolution, medication management) and compares them to a 4-hour baseline.
- **Ambient Mood Score** (`mood-score.ts`): a weighted composite of health (30%), relational (25%), operational (25%) and caregiver (20%) scores, with a seeded 30-day history and a rising/stable/falling trend.

---

## 3. How it's built

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js **15.5** App Router (TypeScript), React 19, Turbopack |
| Styling | Tailwind CSS v4 with Material Design 3 dark tokens as CSS variables |
| AI | Vercel AI SDK (`ai` v6) with `@ai-sdk/google` (Gemini 2.5 Flash/Pro) and `@ai-sdk/openai` pointed at NVIDIA (Nemotron) and local Ollama |
| Database | SQLite via Prisma 7 and `@prisma/adapter-better-sqlite3` |
| State | Zustand 5 (three stores), SWR |
| Visualisation | **D3** (force-directed family health map), **Recharts** (timelines, load charts, Health Twin, mood score), Framer Motion (animation) |
| Validation | Zod 4 |
| UI extras | Sonner toasts, Lucide icons, `@faker-js/faker` and `date-fns` for mock data |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (data) |

### Architecture at a glance

```
Browser (client components + Zustand)
   │  FamilyHydrator → GET /api/family → family-store
   │  agent-store.runAgent() → POST /api/agents/{operations|health|connection|caregiver}
   │  briefing page   → POST /api/briefing/generate → GET /api/briefing
   ▼
Next.js route handlers (app/api/*)
   │  isDemoMode?  → return pre-baked data instantly
   ▼
lib/agents/*  ──►  safeGenerateObject()  ──►  Gemini  ──(rate-limited)──►  Nemotron (NVIDIA)
   │                                          └─ Privacy Vault ──► local Ollama (health only)
   ▼
lib/db (Prisma singleton + queries) ──► SQLite (dev.db)
```

### AI layer
- `lib/ai/client.ts` exports `geminiFlash`, `geminiPro` and `nemotronNano`. The Nemotron model is built with `nvidia.chat(...)`, because the OpenAI provider's default call goes to the Responses API, which NVIDIA doesn't support.
- `lib/ai/safe-generate.ts` is the one doorway for structured output. It wraps `generateObject` with a timeout (45 s primary, 60 s fallback), token-usage logging, and an **automatic fallback to Nemotron on rate-limit/quota errors** (429, `RESOURCE_EXHAUSTED`). It returns `{ ok: true, data } | { ok: false, error }` instead of throwing. Fallback calls use JSON mode with thinking disabled to avoid minutes of reasoning latency.
- `lib/ai/ollama.ts` and `lib/ai/sanitize-health.ts` implement the **Privacy Vault**:
  - When enabled (env var, or toggled at runtime via `POST /api/privacy/status`), the Health agent routes to a local Ollama model (`deepseek-r1:8b` by default).
  - If Ollama is unreachable, the agent **throws instead of falling back to the cloud**.
  - Before the final Gemini synthesis, lab values and medication names in the health output are regex-redacted to `[value]` and `[medication]`.

### Data layer
- Prisma schema (`prisma/schema.prisma`): `Family → FamilyMember → HealthProfile, Medication, CalendarEvent`, plus `Family → MealPlan → Meal` and `Family → Briefing`. A single migration (`init`) exists.
- SQLite has no JSON type, so JSON blobs (conditions, labs, wearable data, interactions, alerts) are stored as strings and parsed in `lib/db/queries.ts`.
- `lib/data/seed.ts` wipes and reseeds from `lib/data/mock-family.ts` (`npm run seed`). `mock-connection.ts` and `mock-caregiver.ts` hold the pre-baked output used as fallback and demo data.

### API surface (`app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `family` | GET | Full family graph |
| `family/members`, `family/members/[id]` | POST; GET, PUT | Add, read and edit members |
| `family/events` | POST, DELETE | Calendar events |
| `agents/{operations,health,connection,caregiver}` | POST | Run one agent. On error these return mock data flagged `_mock: true`, so the UI always has something to render |
| `agents/connection/repair` | POST | Generate a 7-day relationship repair protocol |
| `briefing` | GET | Latest stored briefing, plus mood score and invisible hours |
| `briefing/generate` | POST | Run the orchestrator. Returns a cached briefing if under 1 hour old, unless `?force=true` |
| `briefing/member/[memberId]` | GET | Personalised briefing for one member |
| `privacy/status` | GET, POST | Read or toggle the Privacy Vault, and check Ollama status |

### Demo mode
`NEXT_PUBLIC_DEMO_MODE=true` (`lib/demo/mode.ts`) makes the routes skip the DB and LLMs and return hard-coded data instantly, as protection against outages and slow responses during a live demo.

### State and UI
- **Stores** (`store/`): `family-store` (hydrated once by `FamilyHydrator`), `agent-store` (per-agent status `live | preview | thinking | idle`, outputs, and `runAgent`), `briefing-store`. All use `create` + `devtools` with flat state.
- **Pages** (`app/`):
  - `/` landing, and `/onboarding` (3-step flow)
  - `/briefing`: the hero page, with a member switcher, daily briefing, active alerts, Time Dividend, invisible hours, mood score, memory capture and a mini health view
  - `/operations` and `/operations/meal-plan`: meal grid, calendar conflicts, family agenda, school drafts and health briefs, and an add-event modal
  - `/health` and `/health/[memberId]`: D3 family health network, pattern alerts, member summaries, timelines, lab results, medications and Health Twin charts
  - `/connection`: drift alerts, micro-interventions timeline, Memory Vault and repair protocols
  - `/caregiver`: load distribution, risk summary, breakdown table and invisible hours
  - `/settings`: family registry (add/edit members) and the Privacy Vault controls
- **Design system**: dark-first Material Design 3 palette (primary `#cfbcff`, tertiary gold `#e7c365`, surface `#141218`). Components reference `var(--token)` values rather than Tailwind theme keys, and use an editorial, terminal-style look with mono labels.

### Design process
The `stitch/` folder holds **27 Google Stitch mockups** (HTML plus screenshots): briefing, meal plan, health hub variants, three "blueprint/editorial/terminal" onboarding styles, member profiles, connection and caregiver variants, and settings. These were pulled in through the Stitch MCP server (`.mcp.json`) and used as the visual reference for the Next.js build. The original plan is in `structure.txt`.

### Project size
Roughly 16k lines across about 100 source files (TypeScript/TSX). No test runner is configured.

---

## 4. Running it

```bash
cd bayt
npm install
npm run seed         # create/reseed the Al-Salem family in dev.db
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # production build
npm run lint
npx prisma studio    # browse the DB
```

Environment (`.env.local`, see `.env.local.example`):

| Variable | Purpose |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini |
| `NVIDIA_API_KEY` | Nemotron (fallback, and primary for Connection and Caregiver) |
| `DATABASE_URL` | `file:./dev.db` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` serves pre-baked data with no AI or DB calls |
| `PRIVACY_VAULT_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Local-only health inference. These are read by the code but not listed in `.env.local.example` |

---

## 5. Status, caveats and known gaps

**Working end to end:** all five dashboard sections, the briefing orchestration, member editing, calendar events, the Privacy Vault toggle and demo mode.

**Caveats found while reading the code:**
- **No authentication.** The landing page links straight to `/briefing`, there is no middleware or auth library, and the "family login" is only visual.
- **The Privacy Vault is partial.** It covers the Health agent and the synthesis step. The Operations agent still sends conditions and medication names to Gemini, and the Caregiver agent sends conditions, risk flags and medications to NVIDIA. Redaction is regex-based and only matches a fixed list of medication names.
- **The vault toggle is in-memory.** It lives in module state, so it resets on server restart and won't hold across multiple instances.
- **Hard-coded to the demo family.** The Caregiver schema names Salem/Fatima/Layla/Khalid/Aisha as fixed keys, and several prompts mention them directly. A different family would need those changed.
- **Cultural calendar is 2026-only.** Ramadan, Eid and school-term dates are literals, so the context layer goes quiet after 2026.
- **Seeded events are frozen in May 2026.** `getRecentCalendarEvents` only reads events within ±7–14 days of the current date, so on any other date the Operations agent sees "no upcoming events", and the Connection and Caregiver prompts are built from `member.calendarEvents` in the same way. The seed's event dates need shifting, or generating relative to today, for the calendar-driven output to be meaningful.
- **A health fact is inconsistent.** The dust-season override in `cultural-context.ts` says "Khalid asthma risk", but the seed data and the Operations agent give the asthma to **Layla**.
- **Some "live" data is simulated.** Mood-score history is a seeded random walk, and the stress forecast and drift inputs behind the mood score are mocked in `api/briefing/route.ts`. The Connection agent infers from calendars only, since no chat logs exist. The mock health data and `wearableData` are synthetic.
- **The saved briefing is thin.** `saveBriefing` stores `healthOutput` as `{}` and puts insights inside `opsOutput`.
- **Type errors.** `tsc-out.txt` holds a snapshot of 15 TypeScript errors (e.g. Framer Motion `ease` typing in the briefing page). It may predate later fixes, so re-run `npx tsc --noEmit` to confirm.
- **Housekeeping.** `.mcp.json` at the repo root contains a plaintext Stitch API key, and the project is not in a git repository.

### Where the existing docs are out of date
- `bayt/CLAUDE.md`, `GEMINI.md` and `bayt-analysis-report.txt` describe the Connection and Caregiver agents as pre-baked stubs. They are now **real LLM agents** (Nemotron), with the mock data kept only as a fallback.
- `structure.txt` is the original plan. It mentions an Anthropic client, `mock-health.ts` and shadcn `ui/` components, none of which were built. The app uses Gemini and NVIDIA, and `components/ui/` holds only `ErrorState`, `Skeleton` and `sonner`.
- `.env.local.example` calls the NVIDIA fallback "DeepSeek v4 Pro", but the code uses `nvidia/nemotron-3-nano-30b-a3b`.
- The root `CLAUDE.md` still says the agent pages are unbuilt. All of them exist now.
