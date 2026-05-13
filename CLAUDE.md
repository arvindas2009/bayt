# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is Bayt

Bayt is an AI-powered family operating system — a Next.js 15 App Router dashboard that runs AI agents (operations, health, connection, caregiver) to manage a family's daily life. The demo centers on the fictional **Al-Salem family** (Salem, Fatima, Layla, Khalid, Aisha) with mock data seeded into SQLite.

## Commands

Run from inside this directory (`bayt/`):

```bash
npm run dev        # Dev server at localhost:3000 (Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npm run seed       # Seed Al-Salem family mock data (tsx lib/data/seed.ts)

npx prisma migrate dev   # Apply schema migrations
npx prisma studio        # Browse the database
```

No test runner is configured.

## Environment Variables (`.env.local`)

```
GOOGLE_GENERATIVE_AI_API_KEY=...   # Vercel AI SDK reads this for @ai-sdk/google
NVIDIA_API_KEY=...                  # Nemotron Nano fallback model
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_DEMO_MODE=true          # Skip live AI/DB calls, serve pre-baked data
```

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router (TypeScript), React 19 |
| Styling | Tailwind CSS v4 (dark-mode-first, MD3 tokens via CSS vars) |
| AI | Vercel AI SDK (`ai`) + Google Gemini (`@ai-sdk/google`) |
| ORM | Prisma 7 + `@prisma/adapter-better-sqlite3` |
| State | Zustand 5 (3 stores: `family-store`, `agent-store`, `briefing-store`) |
| Charts | Recharts, Framer Motion |
| Icons | `lucide-react` |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (data) |

## Architecture

### Route Structure

```
app/
├── page.tsx                   # Landing / family login
├── onboarding/page.tsx
└── (dashboard)/
    ├── layout.tsx             # Sidebar + TopBar + FamilyHydrator shell
    ├── briefing/page.tsx      # HERO PAGE — built, "use client"
    ├── operations/            # Partial — meal-plan subpage exists
    ├── health/                # Partial — member detail page exists
    ├── connection/            # Stub
    ├── caregiver/             # Stub
    └── settings/              # Stub

app/api/
├── family/route.ts                 # GET — full family graph from DB
├── family/members/route.ts         # POST — add member
├── family/members/[id]/route.ts    # PATCH/DELETE — edit/remove member
├── family/events/route.ts          # POST/DELETE — calendar events
├── briefing/route.ts               # GET — latest briefing from DB
├── briefing/generate/route.ts      # POST — runs orchestrator, persists result
├── agents/operations/route.ts      # POST — runs operations agent
└── agents/health/route.ts          # POST — runs health agent
```

### AI Layer (`lib/ai/`)

- **`client.ts`** — exports `geminiFlash` (`gemini-2.5-flash`), `geminiPro` (`gemini-2.5-pro`), and `nemotronNano` (NVIDIA fallback). Import models from here.
- **`safe-generate.ts`** — exports `safeGenerateObject<SCHEMA, OUTPUT>()`. Wraps Vercel AI SDK's `generateObject` with a 45s timeout, token logging, and automatic fallback to Nemotron Nano on Gemini rate-limit errors. Returns `{ ok: true, data }` or `{ ok: false, error }`. **Always use this for structured AI output.**

### Agent Layer (`lib/agents/`)

- **`orchestrator.ts`** — `runOrchestrator(familyId)`: runs operations + health agents in parallel, merges pre-baked connection + caregiver stubs, calls `safeGenerateObject` (geminiFlash) to synthesize a `BriefingData`, and persists to the `Briefing` table.
- **`operations-agent.ts`** — produces `OperationsOutput` (meal plan, calendar conflicts, school drafts, timeSavedHours).
- **`health-agent.ts`** — produces `HealthOutput` (family patterns, member summaries, cross-links).

Connection and caregiver agents are **pre-baked stubs** in `orchestrator.ts` — not yet real AI calls.

### Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` to bypass all DB and AI calls. API routes check `isDemoMode` (from `lib/demo/mode.ts`) and return hardcoded `mockOutput` objects or `demoBriefing`. The briefing generate route returns `demoBriefing` instantly.

### Data Layer

- **Prisma singleton**: `lib/db/prisma.ts` — always import `prisma` from here.
- **Query helpers**: `lib/db/queries.ts` — `getFamilyWithEverything()`, `getFamilyMember()`, `getRecentCalendarEvents()`. All JSON columns are stored as `String` and must be `JSON.stringify`/`JSON.parse`d manually.
- **Mock data**: `lib/data/mock-family.ts` (core family), `lib/data/mock-connection.ts`, `lib/data/mock-caregiver.ts`. Seeded via `npm run seed`.

### Client-Side State

`FamilyHydrator` (rendered in the dashboard layout) fetches `/api/family` on mount and populates `useFamilyStore`. Dashboard pages read family data from this store, not directly from the API.

Zustand stores use `create` + `devtools`, flat state (no nested slices), action names as the third arg to `set`.

### Design Tokens

Always use `var(--token-name)` — not Tailwind theme keys:
- Surfaces: `--bg` → `--surface` → `--surface-container` → `--surface-container-high` → `--surface-container-highest`
- Key colors: `--primary` (`#cfbcff`), `--secondary` (`#cdc0e9`), `--tertiary` (`#e7c365`), `--error` (`#ffb4ab`)
- Typography: `var(--font-space-grotesk)` display, `var(--font-inter)` body, `var(--font-jetbrains-mono)` data/mono

## Key Conventions

- **AI calls**: always use `safeGenerateObject` — never call `generateObject` directly.
- **Prisma**: always import singleton from `lib/db/prisma.ts`.
- **Client components**: any component using Recharts, D3, Framer Motion, or Zustand hooks needs `"use client"`.
- **Types**: domain types live in `types/` (`family.ts`, `agents.ts`, `meals.ts`). Agent output shapes are all in `types/agents.ts`.
- **`cn()`**: use for conditional class merging (imported from `lib/utils` or equivalent).
