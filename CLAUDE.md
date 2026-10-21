# CLAUDE.md

Guidance for Claude Code in this repository. **Read the "Status" section first: it says where the work stands and what to do next.**

## What Bayt is

An AI-powered family operating system (Next.js 15 App Router, TypeScript). Demo family: the **Al-Mazrouei** household (Salem, Fatima, Layla, Khalid, Aisha). The story every change must serve:

> Bayt sees the invisible load, finds where the family is fragile, and redistributes the load **with everyone's consent**.

Design principle: **code decides, the model writes.** Facts (load, conflicts, priorities, meal compliance, drift) are computed deterministically. Models only phrase things, write drafts and plans, and every model output is validated or guarded before it is shown.

---

## STATUS: where to continue (update this section when you finish a phase)

Full approved plan: `docs/PLAN.md`. Original improvement list: `docs/IMPROVEMENTS.md`.

### Done: Phase 0 (safety + green build) and Phase 1 (truthful data layer)
- `tsc`, `npm run lint` (0 errors) and `npm run build` pass. Re-run all three before calling any phase done.
- Secrets untracked (`.env*`, `*.db`, `.mcp.json` are gitignored). Stale docs moved to `docs/archive/`.
- One load model, relative-date seed, Emirati meals + validator, priority ranking, consent-based handoffs (API + logic), conflict detection, drift from calendar evidence, run caching, persisted vault setting. Details under "Architecture".
- The interim Caregiver and Connection pages work but are throwaway; Phase 4 replaces them.

### Waiting on the user (do NOT do these without their go-ahead)
1. **`dev.db` reset: DONE 2026-10-15** at the user's request (migrations applied, seeded: 5 members, 54 events, 13 obligations). Prisma now demands the user's consent text in `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` for `migrate reset`; only supply it when the user has just said so.
2. **Keys.** `.env.local` now has both `GOOGLE_GENERATIVE_AI_API_KEY` (added 2026-10-15, verified with a live call: Gemini answers as primary) and `NVIDIA_API_KEY` (fallback). The user should still rotate the NVIDIA key and the Stitch key (the NVIDIA key is in git history).
3. **Commit.** Nothing from Phases 0-3 is committed (git shows `.env`/`.env.local` staged as deleted: that is the intended untracking). Only commit when asked.

### Done: Phase 2 (design system, shader, shell). `tsc`, lint (0 errors) and build pass.
- **Palette/type** (superseded 2026-10-21 by the neon restyle above: Anton replaced Fraunces, token values changed, names kept): `app/globals.css` has the desert-dusk semantic tokens (`--ink`, `--sand`, `--ember`, `--palm`, `--dusk`, `--line`, `--surface-raised`; Tailwind `text-sand`, `border-line`...). The old MD3 aliases were deleted at the end of Phase 4. Fonts in `app/layout.tsx`: Fraunces (`font-display`), Inter, JetBrains Mono (use `.num` for numerals only), IBM Plex Sans Arabic (`:lang(ar)`). Legacy `var(--font-space-grotesk)` is aliased to Inter on `body`, so only redesigned pages get the serif.
- **Motion:** global `prefers-reduced-motion` CSS block + `lib/hooks/useMotionOK.ts`. `PageTransition` is enter-only (App Router cannot run exit animations).
- **LoadField (hand-written WebGL2, no three.js):** `components/visual/LoadField.tsx` (import `LoadFieldLazy` in pages: dynamic, no SSR), shader `components/visual/shaders/loadField.frag.ts`, GL plumbing `lib/gl/{program,useShaderCanvas}.ts` (DPR cap 1.5, pauses off-screen/hidden, survives context loss), layout/aria `lib/load/field-layout.ts`. Props: `bodies`, `flows`, `absentId` (cools + fractures), `sparkIds`, `highlightId`, `onHighlight`, `onSelect`, `labels`. Hooks: `useLoadBodies()` (bodies from the briefing's load snapshot), `useFlows()` (`trigger(fromId,toId)` animates a handoff). No WebGL2 -> CSS gradient fallback; reduced motion -> single still frame.
- **Shell:** Sidebar = Briefing, Load, Operations, Health + Family. TopBar = family name, cultural note, date, global **Viewing as** (`useViewingAs()`, `viewingAsId` persisted in `family-store`; default = top-load member), and one **System pill** (agent status, vault row, data source; label is Demo/Working/Preview/Live/Ready). Briefing page now reads the global perspective (its own switcher is gone).
- **/load** exists (interim body): LoadField + member list + the old Caregiver sections. `/caregiver` redirects to it. Phase 4 adds Resilience Mode here.
- **Verified in the browser** (scratch DB, demo mode): field renders, Fatima runs ember at 88/100, hover highlights, System popover and vault row work, briefing follows "Viewing as".

### Done: Phase 3 (evidence trail, memory capture, handoff UI). `tsc`, lint (0 errors) and build pass.
- **Evidence:** `lib/evidence/resolve.ts` `resolveSources(refs)` turns `SourceRef`s into titles/dates/owners and **drops ids that do not exist** (medications show "Medication schedule", never the drug name). `POST /api/sources`. `components/ui/WhyPopover.tsx` (`<WhyPopover sources={...} />`, renders nothing without sources) is wired into `ActiveAlerts` and the priority card in `MemberBriefingView` (which now also shows the priority's consequence line).
- **Memory capture:** `GET/POST /api/memories` (POST `{quote, memberId}`; 3-280 chars, speaker must be a real member; stored `source:'captured'`). `components/briefing/MemoryComposer.tsx` is mounted inside `MemoryCapture`. `GET /api/briefing` now picks `memoryOfTheDay` live (a memory captured today wins, else rotates by day), so a new memory shows without regenerating.
- **Handoffs UI:** `lib/hooks/useHandoffs.ts` (pending for a member, `respond`, refreshes the briefing store) and `components/handoffs/HandoffInbox.tsx` (Accept / Not now / Suggest someone else). The Briefing page now has a compact `LoadFieldLazy` + the inbox for the "Viewing as" member; accepting calls `useFlows().trigger(from, to)`.
- **Verified in the browser** (scratch DB, demo mode, port 3101): "Why?" lists the real events; as Salem the inbox shows Fatima's two proposals; accepting one moved the Emirates ID renewal (Fatima 88 -> 75, Salem 39 -> 52, Fatima kept as backup), shrank the inbox, redrew the field, no console errors. Invented ids are dropped by `/api/sources`; empty quote / unknown speaker are rejected.
- Not done / left for Phase 4: `WhyPopover` is not yet on the Operations conflicts, Connection drift items or Load rows; the flow animation was not visually caught mid-stream (screenshots lagged), only the end state; the Briefing layout is still the old one around the new block (duplicate "25.4" number, Health Node Map, legacy mono labels).

### Done: Phase 4 step 1, Load page + Resilience Mode. `tsc`, lint (0 errors) and build pass.
- **Pure core:** `lib/resilience/simulate.ts`: `assessResilience(report)` (bus factor = fewest people any job depends on, single points of failure, per category; repeats of one job are grouped) and `simulateAbsence(family, absentId, days, today)` (walks N days of event / obligation / medication occurrences; owner absent + no present named backup = a `Failure`, else a `Cover`; `coverLoad` re-runs `computeLoad` with the covered jobs moved to the backup). Rare jobs are sized by work during the absence (`hours`), not per-week load (`weeklyHours`, which rounds to 0).
- **Plan:** `lib/resilience/plan.ts`: `buildHandoverPlan` (deterministic: lowest-loaded present parent under the burnout line, judged on a normal week; an event's subject cannot cover it; unplaceable = "needs someone outside the family") and `rewordRunbooks` (one `safeGenerateObject` call; clinical items are described generically; output dropped if it adds a number or a gendered pronoun; skipped in demo mode). Placements become pending `Handoff`s via `createPendingHandoffs`.
- **API:** `POST /api/resilience {absentId, days, withPlan?}` (stress test is instant and model-free), `GET /api/load` (records behind each member's number for `WhyPopover`).
- **UI:** `lib/hooks/useResilience.ts` (baseline kept in a zustand store so a re-run after accepting shows before/after), `components/resilience/ResilienceMode.tsx` (controls, verdict, cascade timeline, bus factor, before/after, handover plan). `/load` page now: field + list (with Why), burnout line, `HandoffInbox` for "Viewing as", Resilience Mode. Click a body to choose who is away. LoadField shows `absentId`, `sparkIds` (inheritors + affected people) and a flow from the absent person to each backup. Accepting a handoff here re-runs the stress test.
- The old `RiskSummaryCard`, `LoadBreakdownTable` and `InvisibleHoursBreakdown` are no longer used on `/load` (delete in the Phase 4 cleanup).
- **Verified in the browser** (scratch DB, demo mode, port 3102): Fatima 14 days -> 9 tasks with nobody to do them (EpiPen day 1, alendronate by day 7...), Salem would reach 88/100 covering; drafting the plan sends 6 requests to Salem; as Salem, accepting one re-ran the test (9 -> 8, Fatima 88 -> 87); no console errors. Note: the screenshot tool timed out on this page (WebGL); drive it with `find` + `left_click` + `javascript_tool` reading `main.innerText`. The flow animation and shader fracture were not visually inspected.
- Not tested yet: live (non-demo) runbook rewording; Phase 6 adds unit tests for `simulate.ts`/`plan.ts`.

### Done: Phase 4 step 2, Briefing rebuilt. `tsc`, lint (0 errors) and build pass.
- `/briefing` is one calm column: greeting + date, compact LoadField + consent inbox, **Today's priority** (`PriorityHero`: the one sentence, consequence, Why, then up to 3 other items), **Time given back** (`TimeBack`: the single computed Time Dividend number framed with the Memory Vault quote + "Capture a memory" + "How this is counted"), **Time together** (`MicroActions`: two Connection micro-actions from the stored connection run).
- Removed: Invisible Hours card (the duplicate 25.4), Health Node Map (`FamilyHealthMini`), `ActiveAlerts`, `MemberBriefingView`, `MemoryCapture`, `TimeDividend`, and the whole unused `components/caregiver/`. Handoff requests no longer repeat as an insight line (they live in the inbox); connection insights are not repeated in "Also worth knowing".
- Verified in the browser (scratch DB, demo, port 3102): page renders with real data, no console errors. Not checked: other "Viewing as" members (Aisha's larger type) and the shader visually.
- The unused `/api/briefing` `invisibleHours`/`alerts` fields are still produced; trim them when the briefing API is next touched.

### Done: Phase 4 step 3a, Operations + drop-anything inbox. `tsc`, lint (0 errors) and build pass.
- **Inbox:** `lib/ingest/types.ts` (adapter interface, Zod schemas, limits), `lib/ingest/adapters/upload.ts` (PDF / PNG / JPG / WebP / text file or pasted text), `lib/ingest/extract.ts` (`extractCandidates`), `POST /api/inbox` (multipart, reads only, saves nothing), `POST /api/inbox/confirm` (re-validates, saves `Obligation`s with `sourceType:'inbox'` or `CalendarEvent`s, then re-detects conflicts), `components/operations/DropInbox.tsx` (drop zone + paste + review screen: every item editable, owner chosen by a person, quote shown, nothing saved until "Save").
- **Code decides, the model reads:** members reach the model as aliases (m1..), never ids. Dates are read by code (`findDate`, dd/mm/yyyy) from the quote first; for text, an item whose quote is not found in the text is dropped; task type and obligation-vs-event are corrected by keyword rules (`guessTaskType`) because the NVIDIA fallback model misfiled fees as events and typed them `bill`; unknown categories fall back. Files use `failover:false` (the fallback model is text-only). Demo mode (`isDemoMode`) calls no model: only pasted text, read by `readDates`; if the model fails on text the same date reader is used and the screen says so.
- **Privacy:** the screen says the file or text goes to an AI model (Gemini, or NVIDIA for text if Gemini is down) and is not kept.
- **Operations page rebuilt** to the new tokens: DropInbox, meal grid (`MealPlanGrid`: names + member dots, details in a dialog; the `density` prop is gone), agenda, conflicts (names + `WhyPopover`), and a collapsed "Emails and school notes" drawer. The drafts no longer have a fake "Send": Bayt never sends, you copy the text. `/operations/meal-plan` rewritten (no name-matching, no hard-coded "5 profiles").
- **Verified** (scratch DB, demo, port 3102): paste -> 3 items -> review -> save: 2 obligations + 1 event saved, the new obligations show in a 60-day stress test for the owner (they are beyond the 7-day load window, correctly). Live model path verified with a script (NVIDIA fallback, text). **Not tested:** PDF/image through Gemini (no Google key), the drag-and-drop gesture, other "Viewing as" members, `/operations/meal-plan` in the browser.

### Done: Phase 4 step 3b, Health + landing/onboarding/settings + token cleanup. `tsc`, lint (0 warnings) and build pass.
- **Health** (`/health`, `/health/[memberId]`) rebuilt as plain lists: everyone (status word from labs/risk flags, never colour alone), appointments in the next 21 days (who it is for, who takes them), medications with giver + backup ("No one else can give it" in ember), family patterns, and per person: risk flags, medications, labs, patterns, wearable. New components `MedicationList`, `FamilyPatterns`, restyled `LabResultsTable`. **Removed:** Health Twin tab and `HealthTwin*` types, `FamilyHealthMap` (D3 network), `HealthTimeline` (invented waveforms; the only wearable figures left are three seed numbers on the member page, labelled "Simulated sample figures"), `HealthTwinChart`, `MemberSummariesRow`, `PatternAlertsRow`, the model's "confidence" figure and the fake "Synced HH:mm". The agent still asks the model for `crossLinks` (no longer drawn); drop it from the prompt/schema when next touching `health-agent.ts`. `d3` / `@types/d3` are now unused dependencies.
- **Landing** `/`: server component; hero with `LandingField` (a labelled *sample* household drawn by LoadField), working anchor nav, honest what/how/privacy copy. **Onboarding**: 3 honest steps (household from the DB, "What Bayt reads", ready with real counts); the fake "847 volumes" counter and fake connectors are gone. **Settings**: People (edit/add modals), Privacy Vault toggle (persisted via `/api/privacy/status`), today's season (read-only). Removed: fake integrations/sync times, no-op Disconnect/Delete, non-persisted city and cultural toggles.
- **Tokens:** the legacy MD3 aliases and shadcn mapping are **deleted** from `app/globals.css`. Added semantic `--surface-high`, `--on-sand`, `--ember-soft`. Modals/skeletons/toaster were migrated mechanically (`AddEventModal`, `AddMemberModal`, `MemberEditModal`, `Skeleton`, `ErrorState`, `sonner`, vault badge, viewing-as switcher). Only the semantic tokens plus the `next/font` variables exist now.
- **Deleted:** `components/connection/*` and `/connection` (now redirects to `/briefing`), `AgentStatusDot`, `lib/ai/sanitize-health.ts` (dead, hard-coded drug list).
- **Verified in the browser** (scratch DB, demo, port 3102): all pages render with real data, no console errors, no `mem_` ids; Privacy Vault toggle persists; Add event and Edit member modals pick up the new colours; `/connection` redirects. **Not checked:** the landing shader visually (the automation tab is "hidden", so LoadField pauses by design), other "Viewing as" members, Arabic.
- **Dev-server gotcha:** if `next dev` starts returning 500 with `ENOENT ... _buildManifest.js.tmp` or "Module not found @vercel/turbopack-next/internal/font", an earlier server of yours is still alive on the same port and `NEXT_DIST_DIR`. Kill it by listing `Get-CimInstance Win32_Process` command lines (bash `taskkill` filters silently matched nothing), then `rm -rf` the dist dir and start once.

### Done 2026-10-21: neon poster restyle + light theme (not committed). `tsc`, lint (0), `npm test` (20) and build pass.
- **Look:** modelled on a user-supplied reference (black merch site: giant condensed uppercase titles, outlined words, lime pill CTAs, tilted colour cards, marquee tape). User chose: **bold landing, calmer app**; neon palette; theme follows the OS plus a toggle.
- **Tokens** (`app/globals.css`): same names, new values, read by role. `--sand` = accent *fill* (bright lime both themes, `--on-sand` text on it), `--sand-text` = accent as text/border/focus ring (lime dark, deep olive light), `--ember` hot pink (load/danger, `--on-ember`), `--palm` cyan ("fine"), `--dusk` violet (`--on-dusk`), `--zest` yellow (`--on-zest`). Also `--on-member`, `--scrim`, `--field-label-shadow`, `--grad-hero`. Dark is `:root`/`[data-theme=dark]`, light is `[data-theme=light]`. Member palette in `lib/design/members.ts` is mid-luminance neon.
- **Theme:** a pre-paint inline script in `app/layout.tsx` sets `data-theme` from `localStorage['bayt-theme']` (key in `lib/theme.ts`), else the OS. `lib/hooks/useTheme.ts` (`{theme, resolved, setTheme}`), `components/layout/ThemeToggle.tsx` in TopBar, landing and onboarding headers. Sonner follows `resolved`.
- **Type:** Fraunces replaced by **Anton** (`--font-anton`). `.font-display` = Anton uppercase, **titles only**. `.font-statement` (Inter 600) for sentences set large (priority, Time given back, quotes). Arabic is excluded from Anton/uppercase.
- **LoadField on light:** `u_light` uniform; the shader writes darker, saturated pigment instead of emission. Verified drawing on both themes.
- **Landing** `app/page.tsx`: poster hero (outline + gradient words), `components/landing/Marquee.tsx` (two crossing tapes, aria-hidden, stops under reduced motion), tilted colour-block cards, rotated sticker tags, pink privacy panel. Same copy, no invented numbers.
- **Dashboard:** lime pill for the active nav item, Anton page titles (`text-5xl md:text-6xl`) and section titles (`text-2xl`), yellow season chip. Layouts unchanged.
- **Verified in the browser** (scratch DB, demo, `next start` on 3102): every page in both themes, the Fatima 14-day stress test (9 tasks, Salem 88/100: unchanged), Edit member modal, toggle persists across reload, no stored choice follows the OS. **Not checked:** reduced motion visually, Arabic read-aloud, grandparent large type. Gotcha: `next dev` exited silently twice while compiling routes this session; `next build` + `next start` was stable.

### Done 2026-10-21 (second pass): visual pages, motion, shader backgrounds, landing rewrite (not committed). `tsc`, lint (0), `npm test` (26) and build pass.
- **Why:** after the restyle the user found the pages read like documents, the sidebar too wide, Operations needing long scrolls, Health unclear, the background empty and nothing moving. They asked for animation everywhere, a WebGL background, no gradients on the landing page, an interactive landing background from a library (chose **three.js + @react-three/fiber**), and a fuller explanation from `../Bayt-Project-Report.pdf`. Sidebar choice: **icon rail with labels**.
- **Shell:** `Sidebar.tsx` is an 80px rail (icon + label, lime pill slides with `layoutId`). TopBar `left-20`, main `pl-20 relative z-10`; Sidebar/TopBar are `z-30`, translucent with blur. `components/visual/AmbientField.tsx` (+ `shaders/ambient.frag.ts`, `AmbientFieldLazy`) draws faint aurora ribbons behind every dashboard page (fixed, z-0, aria-hidden, `maxDpr 0.6`, still frame under reduced motion). `useShaderCanvas` now takes `maxDpr` and `label`.
- **Motion:** `components/motion/` = `MotionProvider` (MotionConfig `reducedMotion="user"`, in `app/layout.tsx`), `Reveal`/`Stagger`/`StaggerItem`, `CountUp` (final text is exactly the value; screen readers get it directly), `AnimatedBar` (scaleX, optional dashed tick). Animate opacity on an inner box if a motion item also needs a style opacity.
- **UI kit:** `components/ui/Card.tsx` (`CARD`, `CARD_HOVER`, `IconBadge`, `Avatar`), `components/ui/Tabs.tsx` (accessible tabs, sliding pill, count badges, animated panel). Multi-part pages use Tabs.
- **Pages:** Briefing = card grid (priority hero card, agent cards, LoadField at 380-440px with `bodyScale={1.3}` (new LoadField prop), inbox column hides via `empty:hidden`, TimeBack split into a count-up hours card with animated breakdown bars and a quote card with a Quote glyph instead of the left border). Load = field card + score bars with burnout tick, Resilience Mode controls card, verdict card, results in tabs (How it unravels timeline / Fragile spots bars / Who steps in / Handover plan / Since the first run). Operations = tabs Calendar (default) / Meals / Drop anything / School, state in `?tab=` (Suspense around `useSearchParams`); the rail's urgent dot links to `?tab=school`. Health = member cards (status chip with icon + word, counts) + tabs (appointments / medications / patterns); member page = cards, **lab range bars** from pure `lib/health/range.ts` `parseRange` (tests in `tests/range.test.ts`; "135/85" stays text). `statusOf` moved to `lib/health/status.ts`.
- **Landing:** no gradients (`.text-gradient`, `--grad-hero` deleted); emphasis words are solid `--sand-text`/`--ember`/`--dusk`/`--palm`. `components/landing/HeroScene.tsx` (+ `HeroSceneLazy`): five particle swarms sized by the LandingField sample hours, cursor pushes particles (window listener, canvas has no pointer events), a stream flows from the heaviest swarm every 7 s, additive on dark / pigment on light, pauses off screen, still under reduced motion. New sections from the report: problem, what Bayt does, see the load (constants imported from `reference-durations`), Resilience + consent loop, code decides, built for the Gulf, privacy, six principles, demo family (roles and ages only).
- **Deps added (exact, >= 2 weeks old):** `three@0.186.1`, `@react-three/fiber@9.8.1`, dev `@types/three@0.186.0`. Landing only.
- **Verified in the browser** (scratch DB, demo, `next start` on 3102): landing in both themes (swarms react to the cursor, every section reveals), Briefing (bigger blobs, no left line, count-up, breakdown), Load (Fatima 14 days: 9 tasks, Salem 88/100, unchanged; tabs and bars), Operations (`?tab=school` lands on School, tab switch updates the URL), Health (cards, member page range bars), no console errors, no `mem_` text on screen. **Not checked:** reduced motion (could not emulate), touch/mobile widths, Arabic read-aloud, grandparent type.

### Done 2026-10-21 (third pass): colour-coded text, burnout profile, reachable buttons, pins (not committed). `tsc`, lint (0), `npm test` (37) and build pass.
- **Why:** the user still found the Briefing heading and Today's priority reading like paragraphs, wanted the person over the burnout line (Fatima in the demo) to stand out on Load, important buttons easy to reach, and a way to pin features to the Briefing.
- **Highlight:** pure `lib/text/highlight.ts` `segment(text, people)` splits a sentence into person / quoted title / when / figure parts (tests in `tests/highlight.test.ts`); `components/ui/Highlight.tsx` renders them (person = pill tinted with the member colour looked up by id, title = underlined, when = `--dusk`, figure = `num` `--sand-text`). Display only.
- **Briefing:** the greeting marks the viewer's name with a member-colour band; subtitle is chips (date, written, "Your load n/100" or an ember "over the line" chip). `PriorityHero` is split into a meta row (severity chip with icon + word, When chip from `priority.at`, people from `priority.personIds`), the action through `Highlight`, and an "If nothing is done" band with Why / Read aloud. Agent cards are tinted by agent tone.
- **Load:** rows at or over `BURNOUT_THRESHOLD` get an ember ring, "Over the line, +N" chip and thicker bar; others dim. The at-risk card is a profile panel: XL avatar, summary through `Highlight`, tiles straight from `AtRiskMember` (score count-up, hours vs `WEEKLY_CAPACITY_HOURS`, share %, days since rest) and a "Stress-test without {name}" button that runs Resilience Mode and scrolls to it (`#resilience`, also the target of `/load#resilience`).
- **Buttons:** `components/ui/Button.ts` (`BUTTON_PRIMARY` solid lime, `BUTTON_SECONDARY` outline). `components/layout/PageHeader.tsx` (Briefing, Load, Operations, Health): when the title scrolls away a slim bar with the same actions slides in under the TopBar. `components/layout/QuickActions.tsx` = lime "New" menu in the TopBar (Add event portalled `AddEventModal`, Drop a document, Run a stress test, This week's meals).
- **Pins:** `lib/pins/registry.ts` (8 features), `store/pin-store.ts` (zustand persist `bayt-pins`, one list per Viewing-as person, `usePins` is empty until hydrated; tests in `tests/pins.test.ts`), `components/pins/PinButton.tsx` (toast with Undo) on the Load score card, Resilience controls, every Operations tab (`PanelBar`) and Health's appointments/medications tabs. `components/pins/PinnedBoard.tsx` sits after Today's priority with an Add menu and an empty state; widgets in `components/pins/PinWidgets.tsx` read existing data only (operations output is fetched from today's stored run if missing). `lib/health/appointments.ts` (`upcomingAppointments`, `unbackedCount`) is now shared with the Health page.
- **Verified in the browser** (scratch DB, demo, `next start` on 3102, dark and light): Briefing parts and sticky bar, pin from the board and from Operations, unpin + Undo, pins survive reload, Viewing-as Fatima shows her own (empty) board and the ember load chip, Load row + profile panel, "Stress-test without Fatima" gives 9 tasks and Salem 88/100, New → Add event opens over Health, no console errors, no `mem_` text. **Not checked:** reduced motion, mobile widths, keyboard-only use of the New and Add menus.

### START HERE: Phases 5 and 6 are built; nothing is committed
Phase 5 is DONE (not committed): demo-only date simulator (`/api/sim`, `SimDateGate`, `DateSimulator` in TopBar, presets Ramadan/Eid al-Adha/summer heat/dust season; `getToday()` honours a globalThis override; briefing rows are now dated with `getToday()`) and Arabic read-aloud for grandparent briefings (`textAr` in `adaptive-briefing.ts`, `arabicKeepsFacts` guard, `components/briefing/ReadAloud.tsx`, hidden when the browser has no `ar-*` voice). Phase 6 is DONE too: Vitest (`npm test`, 20 tests in `tests/`, vitest 3 because vitest 5 needs a newer `@types/node`), a real `README.md` with Mermaid diagrams, the parent `CLAUDE.md` rewritten, and cleanup (unused `d3` removed, `crossLinks` no longer requested from the model, `invisibleHours` dropped from `/api/briefing`). Still open: `Meal`/`MealPlan` tables are unused, `alerts` is still returned by `/api/briefing`, and the cultural calendar ends in 2027.

**Demo recipe (scratch DB, no keys needed):** set `DATABASE_URL=file:<scratch>/x.db`, `NEXT_PUBLIC_DEMO_MODE=true`, `NEXT_DIST_DIR=.next-verify`; `npx prisma migrate deploy && npx tsx lib/data/seed.ts`; `npx next dev --turbopack -p 3102` (3101 may be held by an old server that is not yours; find yours with `Get-CimInstance Win32_Process` on the command line, `netstat` can show PID 0). Open `/load`, run the stress test on Fatima (14 days), draft the plan, switch **Viewing as** to Salem, accept one. Re-seed to reset.

Rules for any new or rebuilt UI (from the Phase 2 design system and plan section 2b):
- Use only the semantic tokens (`--ink`, `--ink-muted`, `--sand` (fill) + `--on-sand`, `--sand-text` (accent as text/border/outline), `--ember` + `--on-ember`, `--ember-soft`, `--palm`, `--dusk` + `--on-dusk`, `--zest` + `--on-zest`, `--on-member`, `--scrim`, `--line`, `--line-strong`, `--bg`, `--surface`, `--surface-raised`, `--surface-high`), never hard-coded hex (member colours come from `useMemberLookup().colorOf`). Never use `--sand` as text colour: it is unreadable on the light theme. Check every new screen in **both themes**.
- Titles use `font-display` (Anton, uppercase). Sentences set large use `font-statement`, never `font-display`. Monospace only for numerals via `.num`. No `text-[9px]/[10px] uppercase tracking-widest` labels.
- Sentences that name people, times, titles or figures render through `components/ui/Highlight.tsx`, not as plain paragraphs. Page actions live in `PageHeader` with `BUTTON_PRIMARY` (at most one) and `BUTTON_SECONDARY`. Pins are per Viewing-as person and stored in the browser only.
- One hero number per screen, never the same number twice on a page (exception the user asked for: the over-the-line profile on Load restates that person's figures). No gradients anywhere (emphasis is a solid colour word). Poster decoration (tape, tilt, outlined words, colour-block cards) belongs on the landing page; dashboard pages use `CARD` surfaces (`components/ui/Card.tsx`) with icon badges, avatars and bars. Detail goes behind a "Why?" popover, a disclosure or a tab.
- Pages with several unrelated parts use `components/ui/Tabs.tsx` instead of one long scroll. Charts and bars only draw computed or recorded values, and the number is always in text too.
- Motion is expected everywhere, through `components/motion/` (Reveal/Stagger, CountUp, AnimatedBar, `layoutId` pills), hover lifts and `active:scale`. It must respect reduced motion (`useMotionOK()` for JS-driven movement; MotionConfig skips transforms).
- Every member reference goes through `useMemberLookup()`; perspective comes from `useViewingAs()`. Use `LoadFieldLazy`, never import `LoadField` directly in a page. The ambient shader is mounted once in the dashboard layout; do not add page backgrounds that cover it. three.js / R3F is for the landing page only.
- Keep visible focus, give canvases an `aria-label` (or `aria-hidden` when purely decorative).

### Then (see `docs/PLAN.md`)
- **Phase 4:** done (Briefing, Load + Resilience Mode, Operations + inbox, Health, landing/onboarding/settings, token cleanup).
- **Phase 5:** done, see above.
- **Phase 6:** Vitest (none installed yet) for the deterministic modules, README, architecture + sequence diagrams, rewrite the parent `D:\Projects\Coding\Bayt\CLAUDE.md` (stale).

### Known rough spots (not yet fixed)
- `Meal`/`MealPlan` tables are unused (meal plans live in `AgentRun`). `/api/briefing` still produces unused `invisibleHours`/`alerts`. `health-agent` still requests `crossLinks`. `d3` is an unused dependency.
- The real `dev.db` and the API keys are waiting on the user (see above).

---

## Commands (run from `bayt/`)

```bash
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # production build
npm run lint
npm run seed         # tsx lib/data/seed.ts: wipes and reseeds, dates relative to today
npx tsc --noEmit

npx prisma migrate dev     # needs a non-drifted DB (see "Waiting on the user")
npx prisma studio
```

**Browser verification (Claude in Chrome), lessons from Phase 2:**
- Use `http://127.0.0.1:<port>/...`. `localhost` is turned into `https://` by the navigate tool and fails. Sidebar clicks are more reliable than a second `navigate` to a new path.
- Port 3100 may already be held by an old dev server (not yours: do not kill it). Use another port such as 3101 and a distinct `NEXT_DIST_DIR`. Stop your own server afterwards (`netstat -ano | grep :3101`, then `taskkill //PID <pid> //F`).
- Screenshots can be taken before the shader's first frame: wait 5-8 s after load. Screenshot coordinates follow the frame size the tool reports (it can differ between calls).
- To prove the canvas is drawing, wrap `gl.drawArrays` in `javascript_tool` and `readPixels` right after the call (the buffer is not preserved).
- `NEXT_PUBLIC_DEMO_MODE=true` gives full UI with no model calls.
- Delete `.next-verify*` / `.next-build` and `git checkout -- tsconfig.json` when done.
- The first `navigate` in a fresh tab can report success while the tab still shows `chrome://newtab` for a few seconds and `computer` calls fail with "browser-internal URL". Do not open more tabs: call `tabs_context_mcp` / wait and retry on the same tab. Use `find` + `left_click` with a `ref` for the Viewing-as options.

**Shell gotcha:** a bash heredoc that contains certain quote characters can fail to parse and write nothing. For TSX files use the Write tool, not `cat <<EOF`.

**Verifying without disturbing a running dev server** (what Phase 1 used):
```bash
# scratch DB: apply migrations + seed, never touches dev.db
export DATABASE_URL="file:<scratchdir>/test.db"
npx prisma migrate deploy && npx tsx lib/data/seed.ts
# separate build dir so .next is not clobbered (next.config.ts reads NEXT_DIST_DIR)
NEXT_DIST_DIR=.next-verify npx next dev --turbopack -p 3100
NEXT_DIST_DIR=.next-build npm run build
```
ESLint ignores `.next-*/`. `git checkout -- tsconfig.json` afterwards: Next rewrites its `include`.

## Stack

Next.js 15 / React 19, Tailwind v4 (tokens as CSS vars in `app/globals.css`), Prisma 7 + `better-sqlite3` adapter, Vercel AI SDK v6 (`ai`), Gemini primary + NVIDIA fallback, Zustand 5, Framer Motion, Recharts, Zod 4, date-fns.

## Environment (`.env.local`; see `.env.local.example`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Must also be in `.env` (Prisma CLI reads `.env` only) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini (SDK reads it by name) |
| `NVIDIA_API_KEY`, `NVIDIA_MODEL` | Fallback. Default `nvidia/nemotron-3-super-120b-a12b`. **NVIDIA retires models**: the old default returned `410 Gone` and silently produced sample data. Probe with a tiny chat request before trusting a model. |
| `PRIVACY_VAULT_ENABLED`, `OLLAMA_*` | Default for the vault; once toggled, the stored `Setting` wins |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = no model calls; all deterministic code still runs on the seeded DB |

## Architecture

### Deterministic core (`lib/`), all pure and unit-testable
- `time/today.ts`: `getToday()` (the one place "now" comes from), `at(offset, 'HH:mm')`, `daysBetween`.
- `load/reference-durations.ts`: minutes per task type (labelled **planning assumptions**), `WEEKLY_CAPACITY_HOURS=20`, `BURNOUT_THRESHOLD=75`, `BASELINE_WEEKLY_HOURS=12`.
- `load/model.ts`: `computeLoad(family, today, {assumeAccepted?})` is **the single source of truth** for hours, score (0-100), share %, days without rest. Window = next 7 days. An event counts only if it has an `ownerId`; a medication only if administered by someone other than the patient; open obligations always count for their owner. Everything (Caregiver, Invisible Hours, briefing, priority) derives from it.
- `load/time-dividend.ts`: computed from what Bayt did, times reference durations.
- `briefing/rank.ts` + `briefing/compose.ts`: ranked `PriorityItem`s (conflicts, obligations, handoffs, burnout) and the deterministic briefing. "Today's Priority" is always the top item; generic text is rejected (`isGenericPriority`).
- `ops/conflicts.ts`: conflict detection (flagged OR same-responsible-person overlap) + free-backup lookup. `ops/school-briefs.ts`: school health briefs from templates (conditions never go to a third-party model).
- `meals/`: `constraints.ts` (diagnosis to abstract constraint; keyword checker that ignores explicit "X-free" labels), `library.ts` (Emirati meal pool), `validate.ts` (recomputes `suitableFor`, assigns rotating named substitutes, halal check), `fallback-plan.ts`.
- `connection/drift.ts`: drift from **shared calendar events only** (never claims anything about conversations).
- `handoffs/propose.ts` (proposals), `handoffs/store.ts` (create pending, accept/decline/redirect; accepting changes owner and adds the previous owner as a backup).
- `health/patterns.ts`: local, model-free health summaries (vault path + fallback).
- `utils/cultural-context.ts` + `data/cultural-calendar.ts`: dated table for 2026-2027 (extend yearly); conditions read from member data.
- `ai/guards.ts`: `isFaithfulRewrite`, `isFaithfulNarrative` reject model text that adds/drops numbers, makes unearned comparisons, or balloons.

### AI layer
- `ai/client.ts`: `geminiFlash`, `geminiPro`, `fallbackModel` (NVIDIA; a `fetch` wrapper injects `enable_thinking:false` for Nemotron because the SDK drops unknown provider options).
- `ai/safe-generate.ts`: `safeGenerateObject()` returns `{ok,data}|{ok:false,error}`, never throws. Fails over to the fallback on 401/403/429/503, missing key, quota, overload. `failover:false` for the Privacy Vault's local model (fail-closed: health data never goes to the cloud).
- `ai/ollama.ts`: `isPrivacyVaultEnabled()` is **async** and reads the persisted `Setting`; unreadable = ON.
- `env.ts`: logs which keys are missing, once.

### Agents (`lib/agents/`)
Each returns `AgentResult<T> = {output, isFallback, error?}`. `isFallback` is the only source of the "Preview" state. Routes use `route-helper.ts` + `runs.ts` `serveAgent()`: a same-day stored `AgentRun` is served unless `{force:true}`, so opening a page never burns quota. A 500 means a real bug, never disguised sample data.
- `operations-agent`: conflicts + school briefs deterministic; model writes the meal plan (from constraints only) and email drafts; plan validated; built-in plan on failure.
- `caregiver-agent`: numbers from `computeLoad`; model writes a short narrative, accepted only if `isFaithfulNarrative`; proposals from `handoffs/propose`; pending handoffs count as projected so runs don't stack.
- `connection-agent`: deterministic drift + model wording keyed by pair **number**; Memory Vault = stored quotes only (model never writes quotes).
- `health-agent`: model patterns or local fallback; Health Twin numeric projections were **removed**.
- `adaptive-briefing`: persona from role/age/load (never first name); oneAction = top ranked item; model only rephrases (guarded).
- `orchestrator`: four agents in parallel via cache, composes deterministically, optional wording pass, never throws on model failure.

### Data
Prisma models: `Family` (surname only), `FamilyMember` (**given name only**), `HealthProfile`, `Medication`/`CalendarEvent` (with `ownerId`, `backupIds`), `Obligation`, `Handoff`, `Memory`, `AgentRun`, `Setting`, `Briefing`, plus unused `MealPlan`/`Meal`. JSON columns are strings: `JSON.stringify` on write, parse in `lib/db/queries.ts`.
- Seed (`lib/data/seed.ts`, data in `mock-family.ts`) is relative to today. `lib/data/refresh.ts` `ensureFreshSeed()` re-anchors seeded rows when the day changes (rebuilds `evt_*`, shifts `obl_*`/`memo_*`, re-applies accepted event handoffs). Seeded ids use prefixes in `seed-constants.ts`; user-created rows are cuids.
- The seed deliberately gives Fatima most tasks with no backup (Aisha's weekly dose, EpiPen, school fees, meal planning) so Resilience Mode has real single points of failure.

### API (`app/api/`)
`sources` (POST `{sources: SourceRef[]}` -> resolved records, unknown ids dropped), `memories` (GET, POST `{quote, memberId}`), `family`, `family/members`, `family/events` (POST flags new clashes), `agents/{operations,health,connection,caregiver}` (POST `{force?}`), `briefing` (GET, live load/priority overlay), `briefing/generate`, `briefing/member/[memberId]`, `handoffs` (GET `?toId&status`), `handoffs/[id]` (PATCH `{action: accept|decline|redirect, redirectToId?}`), `privacy/status`.

### State and UI
`lib/hooks/useHandoffs.ts` + `components/handoffs/HandoffInbox.tsx` (consent inbox), `components/ui/WhyPopover.tsx` (evidence), `components/briefing/MemoryComposer.tsx` (memory capture).
Zustand stores: `family-store` (hydrated by `FamilyHydrator`), `agent-store` (`runAgent(agent, {force?})`, honest `idle` until run, `agentMeta`), `briefing-store`. Pages are `"use client"`.
Tokens are CSS vars in `app/globals.css` (neon poster palette since 2026-10-21, dark + light via `data-theme`; see the restyle entry under Status).

## Conventions and gotchas
- **Never match members by name.** Match by `id` or `role`. Names are given names only; the surname is `Family.name`. LLM schemas take member ids.
- **Event categories are lowercase** (`medical`, `education`, ...); normalised in the seed, the row parser and the events route.
- Internal ids (`mem_*`) must never reach the UI: use `useMemberLookup()`.
- No gendered pronouns in generated or template text: member records carry no gender. Use names or "they".
- Every number shown must come from `computeLoad` or another deterministic module. "87% of household load" style claims are banned: a score is "x/100", a share is a computed %.
- Privacy by design: Operations/Caregiver prompts get constraints and hours, never diagnoses or medication names. Calendar titles may reach the model; conditions may not (Health agent excepted, and it is local-only when the vault is on).
- Use `safeGenerateObject` for every structured model call. Use `isFaithfulRewrite`/`isFaithfulNarrative` for prose built around computed facts.
- **Shell/regex warning:** backslashes get eaten between the tool and the shell, and a Python heredoc turned `\b` into a literal backspace character once. Write regexes with the Write/Edit tools, never inside `python - <<EOF` heredocs. Scan with `grep -rlP "[\x00-\x08]" app components lib store types`.
- `docs/archive/` holds stale docs (Stitch-era `structure.txt`, `GEMINI.md`, analysis reports). The `stitch/` folder one level up has 27 UI mockups (reference only; the redesign is not bound to them).
- Do not commit, push, rotate keys, or reset the database unless the user asks.
