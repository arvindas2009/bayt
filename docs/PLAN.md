# Bayt — Improvement + Redesign Plan

## Context

`bayt-improvements.md` lists 32 items under one story: **Bayt sees the invisible load, finds where the family is fragile, and redistributes it with everyone's consent.** On top of that, the UI is overloaded. Repeated numbers, terminal-style mono labels and decorative widgets bury the few things that matter. The user wants the app decluttered and made more impressive with WebGL shaders.

I audited the code with three read-only explorers and walked every page of the running app at localhost:3000. The audit **confirmed most of the list, corrected two items** and found about 20 extra issues (marked **[NEW]**).

**Decisions already made by the user:**
- **Shader:** data-driven. A living "load field" where each member is a glowing body sized by their computed load. Not ambient decoration.
- **Palette:** a new warm Gulf "desert dusk" palette with editorial type. Mono is used only for numbers.
- **Sequencing:** fix P0 first, then build each P1 feature directly into the redesigned page, so no page is designed twice.
- **Leaked keys:** the user rotates them; I untrack the files and fix `.gitignore`. Git history is not rewritten.

**Corrections to the list:**
- **Item 14:** the app *is* already a git repo, with remote `github.com/arvindas2009/bayt`. The real problem is worse than "not in git":
  - `.env`, `.env.local` (holding `NVIDIA_API_KEY`) and `dev.db` are **committed**. Commit `88886a1` removed the `.env*` rule from `.gitignore`.
  - The Stitch key sits in `D:\Projects\Coding\Bayt\.mcp.json`, in the parent folder, outside the repo.
- **Item 15:** there are now **17** tsc errors and **11** lint errors, not 15. `tsc-out.txt` is stale.
- **Item 1:** the root cause is simply that `GOOGLE_GENERATIVE_AI_API_KEY` is **absent** from `.env.local`. Also, `safe-generate` falls back to Nemotron only on 429, so a missing key goes straight to mock data.

---

## Phase 0 — Safety and a green build (items 14, 15 and new findings)

1. **Secrets** (user action first): rotate the NVIDIA and Stitch keys. Then:
   - `git rm --cached .env .env.local dev.db tsc-out.txt`
   - Restore `.env*` (keeping `!.env.local.example`), `*.db` and `.mcp.json` in `.gitignore`
   - Add a parent-level `.gitignore` covering `.mcp.json`
2. **[NEW] Env validation:** add `lib/env.ts`, a Zod check run once on the server. It logs exactly which keys are missing. `safe-generate.ts` should also fall back to Nemotron on missing-key and auth errors (401/403/"API key"), not just on 429. The user adds `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.local`. Note: `prisma.config.ts` loads only `.env`, so `DATABASE_URL` must stay there (untracked).
3. **[NEW] Route conflict:** `app/page.tsx` and `app/(dashboard)/page.tsx` both resolve to `/`. Delete the `(dashboard)/page.tsx` redirect.
4. **Fix the 17 tsc errors:**
   - `connection/repair/route.ts`: narrow `SafeGenerateResult` before destructuring.
   - `health-agent.ts`: `LanguageModelV1` → `LanguageModel`, and type `twinResult`.
   - `mock-family.ts`: add the missing `calendarEvents`.
   - Framer `ease` arrays in `app/page.tsx` and `onboarding/page.tsx`: add `as const`.
5. **Fix the 11 lint errors and 10 warnings** (unescaped `'`, `any` in `HealthTimeline`, unused vars).
6. **Gate:** `npx tsc --noEmit`, `npm run lint` and `npm run build` must all pass before Phase 1 is called done.
7. **Docs cleanup:** move `GEMINI.md`, `bayt-analysis-report.txt`, `bayt-explained-for-everyone.txt` and the parent `structure.txt` to `docs/archive/`. `PROJECT_SUMMARY.md` stays as the source for the README (Phase 6).

---

## Phase 1 — Truthful data foundation (P0 items 2–13 and 21, 24, 25)

Everything the new UI shows must come from this layer. These are pure TypeScript modules, unit-tested in Phase 6.

### 1a. Seed relative to today (items 2, 8, 9, 10)
- **Rewrite the seed and mock data:** rewrite `lib/data/mock-family.ts`, `mock-connection.ts`, `mock-caregiver.ts` and `seed.ts`.
  - Add a helper `at(dayOffset, "HH:mm")` relative to `startOfDay(now())`. Use it for every event, memory, briefing history and mood point.
  - Generate a realistic week across −14…+21 days: school runs, Aisha's physio and appointments, Salem's travel, and Layla's exams.
- **One surname everywhere:** Al-Mazrouei. Member records already use it. Set `Family.name`, prompts, TopBar (read from the store instead of hard-coding "Al-Salem" at `components/layout/TopBar.tsx:25`), and briefing copy.
  - "Al-Salem" is also hard-coded at: `briefing/page.tsx:92`, `settings/page.tsx:273`, `adaptive-briefing.ts:51`, `operations-agent.ts:175` and `api/agents/operations/route.ts`.
- **[NEW] Names vs IDs:** members are stored as "Salem Al-Mazrouei", but code compares `name === 'Salem'`. Because of this, these never fire:
  - every persona in `adaptive-briefing.ts:31-43,110`
  - the default member (`briefing/page.tsx:198`)
  - "Generate repair" (`connection/page.tsx:185`)
  - `resolveConflictByDate` (`store/family-store.ts:89`)
  - meal avatar dots (`MealPlanGrid.tsx:66`)

  **Fix:** `FamilyMember.name` holds the given name only, and the surname comes from `Family.name`. All logic matches on **ID or role**, never on name. LLM schemas take member IDs constrained with `z.enum(memberIds)`, which also closes item 7 at the source.
- **[NEW] Event categories:** normalise to a lowercase enum on seed and on insert. `caregiver-agent.ts:72` filters `'medical'` but the seed writes `'Medical'`, so the Caregiver agent never sees appointments.
- **Remove "Arvin Das":** the seed already wipes the DB, so a re-seed removes it.
- **Conditions:** the cultural layer reads conditions from member data (`lib/utils/cultural-context.ts`); there is no hard-coded "Khalid asthma".
- **[NEW] Cultural calendar, now rather than Phase 5:** today is October 2026, so the school-term, exam and Eid constants (all ending June 2026) already produce nothing. Move the 2026–2027 dated table into this phase. Phase 5 then only adds the date simulator.
- **Calendar window:** widen `getRecentCalendarEvents` (`lib/db/queries.ts`) to −7…+14 days. It is the only window logic.

### 1b. Single load model (items 5, 21, 25, 28)
- **New `lib/load/reference-durations.ts`:** a documented table of minutes per task type (school run, appointment escort, medication administration, bill payment, renewal, meal planning, conflict resolution). Each entry carries a citation comment.
- **New `lib/load/model.ts` — `computeLoad(family, obligations, handoffs, today)`.** It returns, per member:
  - `hoursThisWeek` by category
  - `score` 0–100 (hours ÷ a stated weekly capacity, clamped)
  - `shareOfLoad` % (member hours ÷ family hours; this is the only place a "%" is allowed)
  - `daysWithoutRest`: days since the last `personal`/`rest` block (one computed value)
- **Ownership rules:** load is attributed to the task **owner**, not the patient. Aisha, as a care recipient, generates load but carries little.
- **Replace existing calculations:** `lib/utils/invisible-hours.ts` becomes a view over `computeLoad`, and Time Dividend becomes `lib/load/time-dividend.ts`:
  - Count what Bayt did (conflicts resolved, meals planned, drafts written, handoffs accepted).
  - Multiply each count by the same reference durations.
- **Caregiver agent narrates only:** it receives the computed numbers and only writes narrative. Its schema no longer outputs scores. This also fixes item 30: the schema becomes an array keyed by member ID, with no Salem/Fatima keys.
- **Delete** `lib/utils/mood-score.ts` and Family Pulse (the faker random walk, item 25), plus the sync score.
- **Mark simulated values:** any remaining simulated value (wearables, `HealthTimeline` `generate30Days`) carries a visible "simulated" tag.

### 1c. Meals: compliant and Emirati (items 3, 4, 24)
- **New `lib/meals/constraints.ts`:** a deterministic mapper from diagnoses to constraints:
  - T2D → low-glycemic, low-sodium
  - Vegetarian → no meat or fish
  - Nut allergy → no tree nuts, peanuts or traces
  - Hypertension → low sodium
  - Fatima gluten-sensitive → gluten-free. The current Chicken Wrap also breaks this.
  - Aisha → soft foods
  - The Operations and Caregiver prompts receive **only constraints**, never diagnoses or drug names (item 24).
- **New `lib/meals/validate.ts`:** checks each meal's ingredient tags against each assigned member's constraints. On a violation, it removes that member and attaches a named substitute, e.g. "Layla: vegetable machboos". It runs after the LLM and on the fallback.
- **Operations prompt** favours Gulf home cooking: harees, machboos, balaleet, lentil shorba, saloona, madrouba, luqaimat (occasional). Meals carry structured `ingredients[]` so the validator has something to check. In Ramadan it switches to suhoor and iftar.
- **Fallback plan:** a hand-written, varied, fully compliant 7-day Emirati plan.

### 1d. Priority, names, consent, claims (items 6, 7, 11, 12, 13)
- **Today's Priority:**
  - Rank alerts deterministically (`lib/briefing/rank.ts`: severity × time-to-deadline × consequence).
  - The composer schema requires `person`, `time` and `consequence`, and rejects generic phrasing with a Zod `refine` on banned stems such as "review your schedule".
  - The fallback uses the top-ranked alert.
- **No IDs in the UI:** add a `useMemberLookup()` hook. Every member reference (starting with `CalendarConflicts`) renders a name and avatar.
- **Vault badge:** "Cloud mode" (neutral) when off, "Local vault active" when Ollama is up, and an amber warning only when the vault is on but Ollama is down.
- **Connection claims:** the prompt only allows evidence statements ("no shared calendar events in 9 days"), and the UI shows that evidence. Drift severity labels are removed (item 28).
- **Interventions:** stop applying them automatically. They become `Handoff` proposals (see Phase 3).
- **[NEW] Memory Vault:** quotes are currently **invented by the LLM** (`connection-agent.ts:125-131`), which is fabrication. The vault becomes user-captured only:
  - Seeded sample quotes, labelled as such
  - A simple "Capture a memory" input
  - The Connection agent may *select* a quote but never write one
- **[NEW] Health Twins:** `interventionsApplied` asks the model for "changes the Operations Agent has ALREADY made silently" (`health-agent.ts:235`). These are invented. Remove them along with the numeric projections.

### 1f. **[NEW]** Agent reliability and cost
- **Orchestrator never throws:** `orchestrator.ts:189` currently throws when synthesis fails, so the `Briefing` table is **empty**. On failure it should compose deterministically from `rank.ts` and persist anyway, marked `source:'fallback'`.
- **New `AgentRun` model:** agent, familyId, output JSON, `isFallback`, error and createdAt. Pages read the latest run; "Regenerate" is the only thing that triggers a new run.
  - Remove the 60 s auto re-run on Connection and Caregiver.
  - Persist the generated meal plan to the existing (never-written) `MealPlan` and `Meal` tables.
- **Preview state:** comes from `isFallback` on the run, so the TopBar System pill tells the truth.
  - Demo mode is labelled "Demo" and no longer "Preview".
  - The demo payloads in `lib/demo/mode.ts` and `api/briefing/*` use relative dates.
- **Verify `mode:'json'`:** check that `safe-generate.ts:78,102` actually reaches the provider under AI SDK v6. It may be dropped silently. If it is, switch to `providerOptions` or `output: 'object'`.
- **Remove repair protocols** (`connection/repair` route and `RepairProtocolCard`). The live Connection schema already lacks them, which wipes the mock protocols. Evidence-based micro-actions cover that need.

### 1e. **[NEW]** Fake or hard-coded UI values to remove
| Where | What |
|---|---|
| `TopBar.tsx:73-76` | Agent status dots hard-coded (OPS shows "live" while showing preview data). Wire them to `useAgentStore`. |
| `briefing/page.tsx:369` | `memoriesThisWeek={5}` hard-coded |
| `RiskSummaryCard.tsx:113,124,337` and `LoadBreakdownTable.tsx:93` | "Fatima", "43 points" and "6 days" hard-coded |
| `connection/page.tsx`, `caregiver/page.tsx` | Agents **re-run every 60 s** (costing API quota). The "Connection trial data" banner pops in every minute. Remove both. |
| `health/page.tsx:174`, `settings/page.tsx:43` | Fake "Synced" times; Disconnect and Delete buttons do nothing |
| `onboarding/page.tsx:407` | Fake "847 volumes ingested" counter |
| `meal-plan/page.tsx:300` | "5 medical profiles" hard-coded; "Export to Calendar" only shows a toast |
| `app/page.tsx:86` | Landing nav items are plain non-clickable spans |
| `components/briefing/DailyBriefing.tsx` | Unused; delete |
| `briefing/page.tsx:198` | Default member found by `name === 'Fatima'`; use the top-load member instead |

---

## Phase 2 — Design system and shader foundation

### 2a. "Desert dusk" tokens (rewrite `app/globals.css`)
- **Colours.** Replace the MD3 purple set with semantic tokens:

  | Token | Value | Use |
  |---|---|---|
  | `--bg` | `#0D0A12` | night indigo |
  | `--surface` | `#15111C` | |
  | `--surface-raised` | `#1D1826` | |
  | `--line` | `rgb(243 237 228 / .08)` | |
  | `--ink` | `#F3EDE4` | |
  | `--ink-muted` | `#A39A8F` | |
  | `--sand` | `#E8C792` | accent |
  | `--ember` | `#E0754A` | high load / critical |
  | `--palm` | `#7DBB93` | OK |
  | `--dusk` | `#8F7DC4` | secondary |

  Keep the old names as aliases for one pass so nothing breaks, then remove them.
- **One member palette** in `lib/design/members.ts`. It replaces the six conflicting colour maps (briefing, health, health map, meal plan, connection and settings).
- **Type:**
  - Fraunces (display, optical sizes) and Inter (body) via `next/font`
  - JetBrains Mono **only** for numerals and data
  - IBM Plex Sans Arabic for Arabic text
  - Remove almost every `text-[9px]/[10px] uppercase tracking-widest` label.
- **Motion:** add a global `@media (prefers-reduced-motion)` block plus a `useMotionOK()` hook. This also covers the 36 unguarded `animate-pulse`/`spin` uses.

### 2b. Declutter rules (applied to every page)
1. At most **one hero number per screen** and **one number per card**. A number never appears twice on a page.
2. Each page answers one question. Everything else moves behind "Why?" popovers (the item 20 evidence) or a details drawer.
3. Remove the per-page stat bars and repeated "N found" headers. Merge the TopBar status row into one "System" pill that opens a popover with agent status, vault mode and data sources.
4. No decorative widgets: remove the health node map on Briefing, the terminal "SYS.MANIFEST" copy and the ghost dashboard on the landing page.
5. Use generous whitespace, larger type and fewer borders. Cards are separated by space, not 1 px boxes.

### 2c. WebGL `LoadField` (the hero visual)
- **No new 3D dependency.** A hand-written WebGL2 fragment shader is enough and keeps the bundle small. Files:
  - `lib/gl/useShaderCanvas.ts`: sets up a WebGL2 context and a full-screen triangle, uploads uniforms, runs `requestAnimationFrame`, handles resize at device pixel ratio capped at 1.5, and pauses on `visibilitychange` and `IntersectionObserver`. It also handles context loss.
  - `components/visual/LoadField.tsx`: a `"use client"` component loaded with `next/dynamic` and `{ ssr:false }`. It takes props `bodies: {id, x, y, load, color}[]`, `flows: {from, to, t}[]`, `absentId?` and `highlightId?`.
  - `components/visual/shaders/loadField.frag.ts`: the GLSL source as an exported string, so no loader config is needed.
- **Shader design:**
  - Each member is a soft metaball whose radius and heat follow `computeLoad().score`. Bodies sit on a smooth SDF union.
  - Domain-warped fbm noise gives a slow "silk/sand" surface. The colour ramp runs from night through dusk to sand, with ember for overload.
  - **Flows:** curved luminous streams between two bodies, driven by `t`. They animate when a handoff is accepted, so load visibly moves from Fatima to Salem.
  - **Absent mode** (Resilience): the absent member's body cools to grey and fractures. Failure sparks pulse at the bodies that inherit or drop tasks.
  - **Pointer:** hovering near a body brightens it, and the DOM overlay shows the name and hours. Text labels stay in HTML for accessibility and crispness.
- **Fallbacks:**
  - No WebGL2: CSS radial gradients at the same positions.
  - Reduced motion: one static frame.
  - An `aria-label` summarising the load ("Fatima carries 41% of this week's household load").
- **Where it appears:**
  - Briefing hero (compact)
  - Load page (large, interactive, drives the stress test)
  - Landing page hero (fed by seed data)
- **Health map:** removed; it is not ported to WebGL (item 28).

### 2d. Shell
- **Sidebar:** four items — Briefing, Load, Operations, Health — plus Family/settings, with a distinct icon (item 27).
- **TopBar contents:**
  - Family name from the store
  - Date, which also hosts the date simulator in demo mode (Phase 5)
  - A global **"Viewing as"** member switcher, moved here from the Briefing page and stored in `family-store`, so handoffs can be demonstrated on any page
  - The System pill
- **Page transition:** fix `PageTransition`, whose exit animation never runs because it lacks `AnimatePresence`.

---

## Phase 3 — New data models (items 16, 17, 20)

- **Prisma models** (`npx prisma migrate dev --name obligations_handoffs`):
  - `Obligation`: id, familyId, title, category (Residency | Finance | School | Health | Home), dueDate, recurrence (RRULE-lite string), ownerId, backupIds (JSON), consequence, leadTimeDays, sourceType and sourceId
  - `Handoff`: id, fromId, toId, itemType (obligation | medication | event), itemId, reason, status (pending | accepted | declined | redirected), createdAt, respondedAt
  - `Setting`: key/value, used for vault persistence (item 26) and the simulated date
  - `AgentRun`: see 1f. It is created in the same migration if Phase 1 has not already added it.
  - Add `ownerId` and `backupIds` to `Medication` and `CalendarEvent`
- **UAE seed obligations:**
  - Emirates ID and visa renewals, with Salem as sponsor
  - Ejari/tenancy renewal
  - Three school fee instalments
  - DEWA/ADDC bill
  - Salik top-up
  - Car registration (Mulkiya)
  - Aisha's weekly alendronate
  - Khalid's EpiPen expiry and school allergy form
  - Layla's inhaler refill
  - Most of these are owned by Fatima with no backup — deliberately, so the Phase 4 simulator has something to find.
- **Server Actions or routes:**
  - `app/api/handoffs` (GET for a member; POST to create; PATCH to accept, decline or redirect)
  - Accepting a handoff changes `ownerId` and returns the recomputed `computeLoad`.
- **Evidence (item 20):**
  - Add `sources: {type:'event'|'medication'|'obligation'|'handoff', id}[]` to every agent and composer output schema in `types/agents.ts`.
  - The deterministic layer fills sources where it can. Sources returned by the LLM are checked against real IDs, and invalid ones are dropped.
  - New `components/ui/WhyPopover.tsx` resolves the IDs to titles and dates.

---

## Phase 4 — Pages rebuilt (redesign and features together)

| Page | What stays (decluttered) | New |
|---|---|---|
| **Briefing** `/briefing` | Compact LoadField hero. One sentence of Today's Priority, with person, time, consequence and Why. Three ranked items. One Memory Vault quote framed as "what to do with the time you got back". Time Dividend shown as one computed number. | **Handoff inbox** for the "Viewing as" member (Accept / Decline / Suggest someone else); accepting animates a flow in LoadField. Connection micro-actions move here (two at most). |
| **Load** `/load` (replaces `/caregiver`; `/connection` folds into Briefing; old routes redirect) | Large LoadField. Per-member load list (hours + score + "Why"). The burnout line reads "load score 87/100" with one days-without-rest value. | **Resilience Mode (item 18)**, the centrepiece:<br>• **Bus factor** per category and overall, with single points of failure listed<br>• **Stress test:** pick a member and a duration, then run the pure `simulateAbsence()` in `lib/resilience/simulate.ts`. It walks N days of obligation, medication and event occurrences and flags items whose owner is absent and which have no capable backup.<br>• **Cascade timeline** ("Day 2: weekly alendronate missed…")<br>• **Handover plan:** one `safeGenerateObject` call writes short runbooks for the failing items only and proposes handoffs<br>• **Re-run** shows the before/after bus factor and Fatima's score |
| **Operations** | 7-day Emirati meal grid (names + member avatars; tags moved into a hover/drawer). Agenda. Conflicts with names, not IDs. School drafts kept in a collapsible drawer. | **Drop-anything inbox** (item 19). `lib/ingest/adapters/upload.ts` handles PDF, image or pasted text. One `safeGenerateObject` call (geminiFlash, multimodal file part) extracts tasks, events and obligations with a deadline, suggested owner and source, against a Zod schema. A review screen confirms them before saving. Adapter interface: `lib/ingest/types.ts`. |
| **Health** | Medications (with owner and backup), upcoming appointments, family patterns as a list, member detail page. | Health Twins: **numeric projections removed** (item 23); each intervention shows only what it targets. Health network graph removed. Simulated wearable charts tagged. |
| **Landing** `/` | Headline copy and How-it-Works. | LoadField hero replaces the ghost dashboard. Nav links work. |
| **Onboarding / Settings** | Restyled to the new tokens. | Fake counter, sync times and no-op buttons removed. Vault setting persisted (item 26). |

**Deleted components:** `AmbientMoodScore`, `FamilyHealthMini`, `FamilyHealthMap`, `HealthTwinChart` numeric lines, `RelationshipDriftAlerts` severity UI, the `RunningBanner`s, and `DailyBriefing`.

---

## Phase 5 — Culture, demo and accessibility (items 22, 32)

- **Dated table:** the 2026–2027 cultural table is already done in Phase 1a; this phase only adds the simulator.
- **Simulated date:** `getToday()` in `lib/time/today.ts` reads the simulated date from the `Setting` table, or from a cookie in demo mode. Every `new Date()` in agents, the load model, the seed views and the TopBar goes through it.
- **Demo control:** a date picker in the TopBar, shown in demo mode only, with presets for Ramadan, Eid al-Adha, Summer heat and Dust season.
- **Arabic voice:** a read-aloud button on Aisha's adaptive briefing. It uses `speechSynthesis` with the first `ar-*` voice, falls back to a hidden button plus a tooltip, and the Arabic text is produced by the adaptive-briefing schema (`textAr`).

---

## Phase 6 — Tests and docs (items 29, 31)

- **Vitest:** add `vitest` as a dev dependency, `vitest.config.ts` with the `@/` alias, and an `npm test` script.
- **Unit tests** for:
  - `computeLoad`
  - `simulateAbsence` / bus factor
  - the meals validator and constraint mapper
  - cultural context, using fixed dates in Ramadan, Eid and dust season
  - Invisible Hours and Time Dividend
  - priority ranking
  - the env check
- **README:** setup, environment, demo mode and privacy-by-design (the constraint mapper and fail-closed vault).
- **Diagrams:** a Mermaid architecture diagram, plus an orchestrator sequence diagram showing:
  - parallel agents with per-agent fallbacks
  - 429/auth failover to Nemotron
  - typed results
  - the fail-closed vault
- **Update `bayt/CLAUDE.md`** and the parent `CLAUDE.md` to match.

## Out of scope (as the list says)
Chat scanning, scraping portals with credentials, a baby tracker, a subscription tracker. Also deferred: a three.js/R3F dependency, which is unnecessary for 2-D shader fields.

---

## Critical files

- **Data:** `prisma/schema.prisma`, `lib/data/mock-family.ts`, `lib/data/seed.ts`, `lib/db/queries.ts`
- **New logic:**
  - `lib/load/model.ts`
  - `lib/load/reference-durations.ts`
  - `lib/load/time-dividend.ts`
  - `lib/resilience/simulate.ts`
  - `lib/meals/constraints.ts`
  - `lib/meals/validate.ts`
  - `lib/briefing/rank.ts`
  - `lib/time/today.ts`
  - `lib/env.ts`
- **Agents:** `lib/agents/{orchestrator,operations-agent,caregiver-agent,connection-agent,health-agent,adaptive-briefing}.ts`, `lib/ai/safe-generate.ts`
- **Visual:** `app/globals.css`, `app/layout.tsx`, `lib/gl/useShaderCanvas.ts`, `components/visual/LoadField.tsx`, `lib/design/members.ts`
- **Shell and pages:** `components/layout/{TopBar,Sidebar,PageTransition}.tsx`, and every `app/(dashboard)/*/page.tsx`

## Reuse (don't rebuild)
- `safeGenerateObject` (`lib/ai/safe-generate.ts`) for every new LLM call (handover plan, inbox extraction)
- `geminiFlash`, `geminiPro` and `nemotronNano` from `lib/ai/client.ts`
- `getCulturalContext` (`lib/utils/cultural-context.ts`): extend it, don't replace it
- The fail-closed vault in `lib/ai/ollama.ts` and `sanitize-health.ts`: keep it, and add the constraint mapper in front
- The Zustand `create` + `devtools` pattern for the new `viewingAs` state in `family-store`
- `isDemoMode` (`lib/demo/mode.ts`): the demo data must be updated to the new shapes

## Verification
1. `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm test` all pass at the end of each phase.
2. `npm run seed`, then `npm run dev`. With both keys set, all four agents return live output, and there is no "Preview" anywhere outside demo mode.
3. A browser walkthrough with Claude in Chrome checks each page:
   - Upcoming events show this week.
   - No meal pairs Layla with meat or Khalid with nuts; the meals are Emirati.
   - No `mem_` IDs, no "Arvin Das", one surname throughout.
   - The load numbers agree on every page.
   - Today's Priority names a person, time and consequence.
4. **Demo script:**
   - Viewing as Fatima, open Load and run a 14-day stress test on Fatima to get the cascade.
   - Generate the handover plan and switch "Viewing as" to Salem.
   - Accept a handoff and watch LoadField animate the flow.
   - Re-run the stress test: the bus factor rises and Fatima's score falls.
5. Inbox: upload a sample school circular PDF, then review, confirm, and check that the obligation appears on Load.
6. Date simulator: jump to Ramadan, then check that the meals switch to iftar/suhoor, the cultural badge changes and the Connection copy softens.
7. Reduced motion (DevTools rendering emulation): LoadField renders one static frame. With WebGL disabled, the gradient fallback appears.
8. Performance: LoadField stays at or near 60 fps and the canvas pauses when the tab is hidden (DevTools Performance panel).
