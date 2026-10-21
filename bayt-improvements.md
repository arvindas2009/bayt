# Bayt: Improvement List

Core story every change should serve: **Bayt sees the invisible load, finds where the family is fragile, and redistributes the load with everyone's consent.**

Items are grouped by priority. Each item says what is wrong or missing, why it matters, and what "done" looks like.

---

## P0: Bugs and credibility breakers (fix first)

### 1. Live agents are not running
- **Problem:** The Operations page shows "PREVIEW DATA: Google Generative AI API key is missing". The Connection and Caregiver pages also show PREVIEW. Every screen is currently fallback data.
- **Why:** The demo video and the judges' evaluation need real agent output.
- **Done when:** `GOOGLE_GENERATIVE_AI_API_KEY` and `NVIDIA_API_KEY` load from `.env.local`, all four agents return live output, and no PREVIEW banners appear in normal mode.

### 2. Seed data is frozen in May 2026
- **Problem:**
  - Calendar events, Memory Vault quotes ("captured May 7"), briefing items ("May 9") and conflicts ("Fri 8 May") are all hard-dated.
  - `getRecentCalendarEvents` only looks ±7–14 days around today, so Upcoming Events is empty and the agents reason over an empty calendar.
- **Why:** The app looks stale and the calendar-driven agents produce weak or contradictory output.
- **Done when:** All seeded dates (events, memories, briefing history, mood history) are generated as offsets from the current date, and Upcoming Events shows a realistic week.

### 3. The meal plan violates dietary constraints
- **Problem:** Layla is vegetarian, but her avatar appears on Chicken Wrap and Grilled Salmon. The fallback plan is also the same three meals for all seven days.
- **Why:** "Respects every member's diet" is a headline claim, and the screen disproves it.
- **Done when:**
  - A deterministic post-generation validator checks every meal against each member's constraints: vegetarian, Khalid's nut allergy, low-sodium/low-glycemic for Salem.
  - Violating meals are either regenerated or the member is removed from that meal with a substitute.
  - The fallback mock is varied and fully compliant.

### 4. The meal plan isn't culturally relevant
- **Problem:** Oatmeal, chicken wraps and salmon for an Emirati family.
- **Why:** "Relevance to Family Life & UAE" is 25% of the score.
- **Done when:** The Operations prompt and the fallback data favour Gulf/Emirati home cooking (harees, machboos, balaleet, lentil shorba, etc.), include vegetarian variants for Layla, and switch to iftar/suhoor in Ramadan mode.

### 5. Load numbers contradict each other
- **Problem:**
  - The Caregiver banner says Fatima carries "87% of household load", but 87 is a score out of 100, and the other members' bars add up to well over 13.
  - "14 days without rest" appears next to "no personal time blocks in 6 days".
  - The Briefing's Family Pulse shows "Caregiver 22", which matches nothing.
  - Aisha (71, cognitive decline, care recipient) shows more load than Salem.
- **Why:** One inconsistent number makes judges distrust every number.
- **Done when:**
  - One deterministic load model is the single source of truth.
  - The Caregiver score, Family Pulse, Invisible Hours and burnout banner are all derived from it.
  - Copy says "load score 87/100", not "87% of household load".
  - Days-without-rest is one computed value.
  - Care recipients' load reflects reality.

### 6. "Today's Priority" is generic filler
- **Problem:** It currently says "Review your schedule and check in with the family."
- **Why:** It is the most prominent sentence in the app.
- **Done when:** The priority is always the single highest-ranked, specific, actionable item, with a person, a time and a consequence. Generic phrasing is rejected in the composer schema/prompt, and the deterministic fallback picks the top-ranked alert.

### 7. Internal IDs leak into the UI
- **Problem:** Calendar conflict cards show `mem_salem` and `mem_khalid`.
- **Done when:** Every member reference in the UI resolves to a display name and avatar.

### 8. A test member is in the demo family
- **Problem:** "Arvin Das" appears in the member switcher.
- **Done when:** It is removed from the DB and seed, and the switcher shows only the five family members.

### 9. The family name is inconsistent
- **Problem:** The header says "Al-Salem", while the members are "Al-Mazrouei".
- **Done when:** One surname is used everywhere: seed, prompts, header, briefings.

### 10. Asthma is attributed to the wrong child
- **Problem:** `cultural-context.ts` says "Khalid asthma risk", but the seed and the Operations agent give asthma to Layla.
- **Done when:** The cultural layer reads conditions from member data instead of hard-coding names.

### 11. The Vault badge reads as an error
- **Problem:** An amber "VAULT: OFFLINE" badge looks like something is broken.
- **Done when:** It shows a neutral "Cloud mode" state when the vault is off, and "Local vault active" when Ollama is running.

### 12. The Connection agent overclaims
- **Problem:** "No meaningful one-on-one conversation in 9 days" asserts something calendar data cannot know.
- **Why:** It reads as surveillance, or as fabrication.
- **Done when:** Prompts restrict claims to the available evidence ("no shared calendar events in 9 days"), and the UI shows that evidence.

### 13. Interventions are applied without consent
- **Problem:** "Auto-applied: Khalid's pickup moved to Salem", "Aisha's reminders rerouted to Salem's phone".
- **Why:** It is ethically weak (Bayt reassigns people's time without asking) and judges will question it.
- **Done when:** Every intervention is a proposal with a status (pending/accepted/declined). See item 17.

### 14. Repo hygiene and security
- **Problem:** `.mcp.json` contains a plaintext Stitch API key, the project is not in git, and stale docs contradict the code.
- **Done when:**
  - The key is removed from the repo and rotated.
  - `.gitignore` covers `.env*`, `dev.db` (if desired) and `.mcp.json`.
  - `git init` is done with a clean first commit.
  - The README is current.
  - Outdated `CLAUDE.md`, `GEMINI.md`, `structure.txt` and `bayt-analysis-report.txt` are updated or moved to `/docs/archive`.

### 15. The build must pass
- **Problem:** There is a snapshot of 15 TypeScript errors.
- **Done when:** `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass cleanly.

---

## P1: Core new features (the differentiators)

### 16. Ownership and household obligations data model
- **What:**
  - Add an `Obligation` model for recurring household admin, each with:
    - title, category (Residency, Finance, School, Health, Home)
    - due date and recurrence
    - owner and backups[]
    - consequence if missed (e.g. "late fee", "visa lapses", "service disconnected")
    - lead time
  - Add `owner` and `backups[]` to medication schedules and recurring calendar tasks.
- **Seed with UAE-realistic items:** Emirates ID and visa renewals (sponsor dependency), tenancy/Ejari renewal, school fee instalments, DEWA/ADDC bills, Salik top-up, car registration, Aisha's weekly osteoporosis dose, Khalid's EpiPen expiry and school allergy form, Layla's inhaler refill.
- **Why:** This is the data the resilience simulator needs. It also replaces the "subscription tracker" idea with something that fits the story.

### 17. Consent-based handoffs
- **What:**
  - Add a `Handoff` model: from, to, task/obligation, reason, status, timestamps.
  - Caregiver interventions and resilience plans create handoffs, never silent reassignments.
  - Switching the viewer to the recipient (e.g. Salem) shows the request in their briefing with Accept / Decline / Suggest someone else.
  - Accepting updates ownership and recomputes load scores.
- **Why:** It turns redistribution into something visible, ethical and demoable using the existing member switcher.

### 18. Resilience Mode ("What if Fatima can't?")
- **What:**
  - **Bus factor:** per category and overall, defined as the number of members able to perform each critical task. Show the single points of failure.
  - **Stress test:** pick a member plus a duration (e.g. 14 days). A pure, deterministic simulation function walks the next N days of obligations, medications and events, and flags every item whose owner is unavailable and which has no capable backup.
  - **Cascade timeline UI:** dated failures with consequences (Day 2: weekly dose missed; Day 6: school fee late; Day 11: tenancy renewal window closes).
  - **Handover plan:** an LLM writes short runbooks only for the failing items and proposes reassignments as handoffs (item 17). Re-running the test shows the improved bus factor and a lower load score for Fatima.
- **Where:** On the Caregiver/Load page.
- **Why:** It is the centrepiece. It's deterministic code (not an LLM wrapper), uses SE concepts (bus factor, stress testing, runbooks), and produces a measurable before/after.

### 19. "Drop anything" inbox
- **What:**
  1. Upload a school circular (PDF/image), a prescription photo, or pasted WhatsApp/email text.
  2. One structured extraction call (via `safeGenerateObject` with a Zod schema) turns it into tasks, events or obligations, with a deadline, a suggested owner and its source.
  3. A review screen lets the user confirm before saving.
- **Architecture:** Build it as an adapter layer (`lib/ingest/adapters/`), with upload as the first adapter, so school-portal and email adapters can plug in later.
- **Why:** It answers "where does the data come from?" (currently only seed data), and it is the realistic version of "connect to the school portal".

### 20. Evidence trail on every insight
- **What:** Add `sources[]` (record type plus ID) to the agent and composer output schemas. Every briefing item, pattern and alert gets a "why" popover listing the exact calendar events, medications or obligations behind it.
- **Why:** Trust and explainability. It directly counters "the AI made this up".

### 21. Computed Time Dividend
- **Problem:** Time Dividend currently comes from the LLM's `timeSavedHours` estimate.
- **What:** Compute it deterministically: tasks Bayt handled (conflicts resolved, meals planned, drafts written, handoffs arranged) multiplied by documented reference durations, the same approach as Invisible Hours.
- **Why:** The headline metric must be computed, not guessed.

### 22. Date simulator for the cultural engine
- **What:**
  - A demo control that overrides "today" (e.g. jump to Ramadan, Eid, summer heat).
  - The cultural context, meal modes, health overrides and Connection softening all react.
  - Replace the 2026-only literals with a dated config table that covers 2026–2027 at minimum.
- **Why:** The cultural layer is a strength, but it is invisible unless the real date falls in a special period.

---

## P2: Credibility and privacy

### 23. Health Twins projections
- **Problem:** LLM-generated 15-year risk numbers are not defensible.
- **Done when:** Numeric projections are removed (show direction only: what each intervention targets), or replaced with one published, validated risk score implemented as code with a citation.

### 24. Privacy data minimisation
- **Problem:** The Operations agent sends diagnoses and medication names to Gemini, and the Caregiver agent sends conditions to NVIDIA. Regex redaction only covers a fixed list.
- **Done when:** A deterministic mapper converts diagnoses into the constraints each agent actually needs (e.g. "Type 2 diabetes" becomes "low-glycemic, low-sodium meals"), and Operations and Caregiver receive only those constraints. Document this in the README as privacy-by-design.

### 25. Simulated data labelling
- **Problem:** Mood-score history is a seeded random walk, and the stress forecast and drift inputs are mocked.
- **Done when:** Simulated values are either removed or clearly labelled "simulated" in the UI.

### 26. Privacy Vault persistence (optional)
- **Problem:** The vault toggle lives in module memory and resets on restart.
- **Done when:** The setting is persisted in the DB.

---

## P3: Debloat and restructure

### 27. Go from five pages to four
- **Briefing (home):** the daily briefing, handoff requests (item 17), Connection micro-actions, and one Memory Vault quote framed as "what to do with the time you got back".
- **Load:** Caregiver plus Resilience Mode. This is the core page.
- **Operations:** meals, calendar, conflicts, and the inbox (item 19).
- **Health:** medications, appointments, family patterns, and per-member detail.

### 28. Remove decorative or weak elements
- Connection "sync score" and drift severity labels (keep the evidence-based observations and micro-actions).
- Family Pulse composite score, or reduce it to values derived from the single load model.
- Health node map: currently mostly empty space with one connection. Move it below the fold or remove it.
- Health Twins numeric charts (see item 23).
- **Why:** Fewer, truer, consistent numbers read as more impressive than many decorative ones.

---

## P4: Engineering quality

### 29. Tests
- **What:** Add Vitest with unit tests for the deterministic modules:
  - load model
  - resilience simulator and bus factor
  - dietary constraint validator
  - cultural context
  - Invisible Hours
  - Time Dividend
  - health sanitiser/mapper
- **Why:** Technical quality is 15% of the score, and "N passing tests" is a concrete line for the report.

### 30. Generalise the Caregiver schema
- **Problem:** Member names (Salem, Fatima, Layla, Khalid, Aisha) are fixed keys in the Caregiver schema and in several prompts.
- **Done when:** Schemas use arrays keyed by member ID and prompts are built from family data, so any family works.
- **Note:** Can be deferred to the finale.

### 31. Documentation for the report
- An up-to-date README covering setup, environment and demo mode.
- An architecture diagram, plus one sequence diagram of the orchestrator showing:
  - parallel agents with per-agent fallbacks
  - the 429 failover to Nemotron
  - typed results that never throw
  - the fail-closed Privacy Vault
- **Why:** This is real reliability engineering and should be visible.

### 32. Arabic voice briefing for Aisha (optional)
- **What:** A read-aloud button on Aisha's adaptive briefing using browser speech synthesis with an Arabic voice. Falls back gracefully if no Arabic voice is available.
- **Why:** An inclusive, low-cost feature that works well on camera.

---

## Explicitly out of scope (do not build)

- **Scanning children's chats:** an ethical and privacy problem, contradicts the Connection pillar, and is technically impossible on end-to-end encrypted apps.
- **Scraping school portals with parent credentials:** a security risk with no public APIs. Use the inbox adapter instead.
- **Baby development tracker:** the demo family has no infant, and the category is already well served.
- **Consumer subscription tracker:** off-story. Household obligations (item 16) cover the useful part.
