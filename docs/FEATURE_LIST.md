# Bayt: Complete Feature List

Every screen, button, menu and behaviour in the app, written from the code as it stands on 21 October 2026. It is organised the way you meet the app: the shell that wraps every page first, then each page, then the engine underneath.

For architecture, API routes and the data model, see `FEATURES.md`. This file is about what a person sees and clicks.

**Contents**

1. [What Bayt is, in one minute](#1-what-bayt-is-in-one-minute)
2. [The shell: what is on every page](#2-the-shell-what-is-on-every-page)
3. [Landing page `/`](#3-landing-page-)
4. [Onboarding `/onboarding`](#4-onboarding-onboarding)
5. [Briefing `/briefing`](#5-briefing-briefing)
6. [Load `/load` and Resilience Mode](#6-load-load-and-resilience-mode)
7. [Operations `/operations`](#7-operations-operations)
8. [Health `/health` and `/health/[person]`](#8-health-health-and-healthperson)
9. [Settings `/settings`](#9-settings-settings)
10. [Pins: building your own Briefing](#10-pins-building-your-own-briefing)
11. [Shared pieces: Why?, handoff inbox, Tabs](#11-shared-pieces-why-handoff-inbox-tabs)
12. [The engine under the screens](#12-the-engine-under-the-screens)
13. [Modes: live, demo, vault](#13-modes-live-demo-vault)
14. [Things that behave differently than you might expect](#14-things-that-behave-differently-than-you-might-expect)
15. [The demo family](#15-the-demo-family)

---

## 1. What Bayt is, in one minute

Bayt is a family operating system for Gulf households. The demo household is the fictional **Al-Mazrouei** family: Salem, Fatima, Layla, Khalid and Aisha.

The story it tells:

> Bayt sees the invisible load, finds where the household is fragile, and redistributes the work **with everyone's consent**.

Three ideas hold the whole app together:

- **Code decides, the model writes.** Hours, scores, clashes, priorities, meal safety and stress-test results are computed by ordinary tested code. A language model only phrases things and drafts text, and its output is checked before you see it.
- **Consent.** Bayt proposes. A person accepts. Nothing changes who does what until that person says yes.
- **Honesty.** "Preview" appears only when a model really failed. "Demo" appears in demo mode. Sample numbers say "Simulated". Planning assumptions are labelled as assumptions.

The app has four main pages (Briefing, Load, Operations, Health), a Settings page, a public landing page and a short onboarding flow.

---

## 2. The shell: what is on every page

Every page inside the app (everything except the landing page and onboarding) shares the same frame.

### 2.1 The left rail (sidebar)

A narrow 80 px rail with an icon and a label for each destination.

| Control | What it does |
|---|---|
| **Bayt / بيت** wordmark (top) | Goes to the landing page `/`. |
| **Briefing** | Opens `/briefing`. |
| **Load** | Opens `/load`. |
| **Operations** | Opens `/operations`. If any school health note is marked *urgent*, a pink dot appears on the icon and the link opens the **School** tab directly. |
| **Health** | Opens `/health`. |
| **Family** (bottom) | Opens `/settings`. |

The current page is marked with a lime pill that slides between items when you navigate.

### 2.2 The top bar

From left to right:

| Element | What it does |
|---|---|
| **Family name** | Shows the household surname ("Al-Mazrouei"). |
| **Season chip** (yellow, only when relevant) | Reads **Ramadan Mode**, **Dust Season**, **Summer Heat** or **Exam Period**. Click it for a popover titled "Adjusted for the season" explaining what Bayt changed: for example meals switching to suhoor and iftar, or respiratory precautions raised *for whoever actually has asthma in the records*. If nothing seasonal applies, the chip is absent. |
| **Date** (centre, wide screens only) | Today's date, e.g. "Wednesday · 21 Oct 2026". It honours the simulated date in demo mode. |
| **New** (lime button) | A quick-actions menu, described below. |
| **Simulate date** (demo mode only) | Jump the whole app to another date. Described below. |
| **Viewing as** | Choose whose point of view the app is shown from. Described below. |
| **Theme toggle** (sun / moon) | Switches between dark and light. |
| **System pill** | A single status pill with the detail behind it. Described below. |

#### New menu

Click **New** (the plus rotates into an x). Use the mouse, or the arrow keys, Home and End to move through the items.

| Item | Result |
|---|---|
| **Add an event** | Opens the Add event dialog over whatever page you are on (section 7.6). |
| **Drop a document** | Goes to Operations, **Drop anything** tab. |
| **Run a stress test** | Goes to Load and scrolls to Resilience Mode. |
| **This week's meals** | Goes to Operations, **Meals** tab. |

#### Simulate date (demo mode only)

A small outlined button that reads "Simulate date", or the chosen date once one is set. It opens a panel:

| Control | Result |
|---|---|
| **Ramadan** · 12 Feb 2027 | Jumps the app to that date. |
| **Eid al-Adha** · 14 May 2027 | Same. |
| **Summer heat** · 15 Jul 2027 | Same. |
| **Dust season** · 5 Nov 2026 | Same. |
| **Pick a day** (date field) | Jumps to any date you choose. |
| **Back to today** | Appears when a date is set; clears the override. |

Choosing a date reloads the page so every number is recomputed. The calendar events stay anchored to the real date, so a simulated date changes the **season, meals, load window and the cultural banner** rather than the event list. This control does not exist outside demo mode.

#### Viewing as

A pill showing a coloured initial, "Viewing as" and a name. Click it for a list of the five family members with a tick on the current one.

This is the single most important control for demonstrating consent: it lets you answer a request *as the person it was sent to*. It affects:

- Whose briefing you read (greeting, tone, priority).
- Whose handoff inbox is shown.
- Whose pinned board you see (pins are stored per person).
- The default speaker when you capture a memory, and the default owner when you drop a document.

Your choice is remembered in the browser. Until you choose, the app defaults to whoever carries the most hours this week (never a hard-coded name).

#### System pill

The pill's label is an honest one-word summary: **Demo** (demo mode), **Working** (an agent is running), **Preview** (a model failed and built-in logic was used), **Live** (agents ran on real models), or **Ready** (nothing has run yet). Click it for a panel:

- **System:** a list of the four agents (Operations, Health, Connection, Load), each with its own status: *Live*, *Working*, *Preview: model unavailable, using built-in logic*, or *Standing by*.
- **Privacy Vault row:** the current mode, a sentence explaining it, and a button to flip it (section 13.3). It refreshes itself every 30 seconds.
- **A closing note:** in demo mode, "no model calls are made; every number is still computed from the seeded family". Otherwise, "numbers are computed from your family's data; models only write the wording".

### 2.3 The sticky page header

Briefing, Load, Operations and Health open with a big title and the page's main buttons. Once you scroll the title away, a slim bar slides in under the top bar carrying the page name and the **same buttons**, so the main actions are always one click away.

### 2.4 The living background

A faint, slow aurora of light is drawn behind every dashboard page with WebGL. It is purely decorative, sits behind all content, and shows a still frame if you prefer reduced motion.

### 2.5 Feedback and loading

- **Toasts** (bottom of the screen) confirm actions and report errors. Some carry an **Undo** button.
- **A sliding bar** crosses the top of the screen from the moment you click any internal link until the next page arrives, and a matching loader shows in the page area while a route loads.
- **Skeleton cards** hold the layout while data loads.
- **Error screens** on Briefing, Health and Operations show what went wrong with a **Retry** button.

### 2.6 Old addresses that still work

- `/caregiver` redirects to `/load`.
- `/connection` redirects to `/briefing` (its content became "Time together" and the Memory Vault on the Briefing).

---

## 3. Landing page `/`

The public front page. It needs no database. It is one long, poster-style page.

**Header:** Bayt wordmark; anchor links **What it does**, **The load**, **Resilience**, **Privacy** (wide screens); theme toggle; **Open Bayt** button to `/briefing`. A "Skip to content" link appears for keyboard users.

**Hero.** "Invisible work, made visible." sits over an interactive particle scene: five swarms of light, one per sample person, sized by their (labelled sample) hours. Your cursor pushes the particles, and a stream of light flows from the heaviest swarm every few seconds. Two buttons:

| Button | Goes to |
|---|---|
| **Open Bayt** (lime) | `/briefing` |
| **Set up your household** (outlined) | `/onboarding` |

A note in the corner explains the scene is a sample household.

**Two crossing tapes** scroll the phrases "See the load / Find the fragile / Hand over with consent / Drop anything in / Built for Gulf households".

**Sections, in order:**

1. **The work nobody sees.** Why existing family apps miss the point, with a cloud of stickers for the Gulf's own paperwork: residence visa, Emirates ID, Ejari, DEWA bills, Salik, school fee instalments, medication rounds, caring for grandparents, Ramadan routines, dust-season asthma.
2. **What Bayt does.** Four tilted cards: sees the load, finds the fragility, moves work with consent, handles the rest of the week.
3. **See the load.** The load visual drawn from fixed sample figures, plus four plain-language scoring rules (next 7 days; only owned work counts; score = hours ÷ 20 h × 100; burnout line 75/100). The constants shown are imported from the engine, so the page cannot drift from the code.
4. **What breaks if someone is away?** Explains Resilience Mode (copy says any length from 1 to 60 days), a severity legend (missed medicine: urgent; missed paperwork: important; missed event: routine) and the four-step consent loop: **Plan, Word, Ask, Re-run**.
5. **Code decides, the model writes.** Explains the faithfulness checks and the four-step document pipeline: **Read, Check, Review, Save**.
6. **Built for the Gulf.** Five season cards: Ramadan, Eid, Dust season, Summer heat, School terms.
7. **Health stays private.** Four privacy points (constraints not diagnoses, the Privacy Vault, aliases not ids, school notes stay local) and the line "Bayt is not medical advice."
8. **Six principles.**
9. **Meet the demo family.** Names, roles and ages only; no health details on a public page.
10. **See your household.** Final call to action with three promises: nothing is sent on your behalf; nothing moves without a yes; every number has a source.

**Footer:** wordmark, the same anchor links, a **Set up** link, and "Built for the 5th Annual COE Hackathon, 2026".

---

## 4. Onboarding `/onboarding`

A three-step, honest setup. It reads the real household from the database. The step pills at the top show progress (they are not clickable); the theme toggle is in the corner.

| Step | Content | Buttons |
|---|---|---|
| **1. Who is in your household** | The real members with a colour dot, name, role and age. Shows "Loading…" or a clear error ("Could not load your household. Run the seed, then reload."). | **Continue** (disabled until the household has loaded) |
| **2. What Bayt reads** | Three statements: your calendar and records; documents you drop in; nothing else. It states plainly that Bayt is **not** connected to Google Calendar, a wearable, WhatsApp or a school portal in this version. A privacy note mentions the Vault. | **Continue**, **Back** |
| **3. Ready** | Real counts: people, events in the next 7 days, open tasks with deadlines. | **Open Bayt** (to `/briefing`), **Back** |

---

## 5. Briefing `/briefing`

The hero page: one calm column, written for whoever is selected in **Viewing as**. Change the person and the whole page changes tone and content.

### 5.1 Page states

- **Loading:** two skeleton cards. If a briefing from an earlier visit exists it shows immediately while a fresh one is fetched.
- **No briefing yet:** a screen reading "No briefing for today yet" with a **Write today's briefing** button.
- **Writing:** a sliding-bar loader while the four agents run.

### 5.2 Header

- **Greeting** (large title). The viewer's name is underlined in their own colour. The plain version appears at once; when the model's friendlier wording arrives, it fades in. In demo mode only the plain version is used.
- **Three chips:** today's date; "Written *x* ago"; and **Your load n/100**, which turns pink and adds "over the line" at 75 or more.
- **Write it again** (button, repeated in the sticky bar). Forces a fresh briefing: re-runs all four agents, re-ranks priorities, and may create new handoff requests. On failure a toast says "Could not write a new briefing. Showing the last one."

### 5.3 Today's priority

The one thing to do today. Everything in the card is split into parts rather than one paragraph:

| Part | Detail |
|---|---|
| **Severity chip** | **Urgent**, **Needs doing** or **Good to know**, always as icon plus word. |
| **When chip** | The day and time ("Today · 14:00"). A midnight time is treated as a whole-day deadline and shows no clock time. |
| **People** | Overlapping avatars and names of everyone involved. |
| **The action** | One sentence naming a person, a time and what to do, with people, quoted titles, times and figures colour-coded. Larger type for a grandparent. |
| **"If nothing is done"** | A pink band stating the consequence. |
| **Why?** | Opens the records the priority came from (section 11.1). |
| **Arabic read-aloud** | A button labelled **اقرأ بصوت عالٍ** that speaks the Arabic version aloud, then becomes **Stop**. It appears only for briefings that carry an Arabic text (a grandparent's) **and** only when your browser has an Arabic voice installed. |

Priority is always the top-ranked item. Routine daily jobs are load, never "the priority", and vague text like "review your schedule" is rejected by the ranking code.

### 5.4 Also worth knowing

Up to three smaller cards under the priority, each tinted by the agent it came from (**Operations**, **Health** or **Load**, shown as word plus icon). Connection ideas are not repeated here because they have their own section lower down.

### 5.5 Pinned board

Your personal corner, described in full in section 10.

### 5.6 Who carries the house this week

A card with the compact load visual (blobs sized and heated by each person's load).

- **Hover** a blob to see its label and highlight it.
- **Open Load** (button in the card's corner) goes to `/load`.
- Beside it, the **handoff inbox** appears whenever someone is asking the viewer for help, and disappears completely when nobody is (the visual then takes the full row).

Clicking a blob does nothing here; selecting a person is a Load-page feature.

### 5.7 Time given back

Two cards side by side.

**Hours card.** A count-up number of hours of coordination Bayt took off the family this week.

- **How this is counted** (disclosure button): expands into one line per kind of work (count × minutes) with animated bars, and the note that each count is multiplied by a *planning assumption*.

**Memory card.** One stored quote, shown word for word with the speaker and date. A memory captured today wins; otherwise the vault rotates by day. The model never writes or edits a quote. Under it:

- **Capture a memory** opens a small form:
  - a text box (3 to 280 characters, counter-enforced) labelled "What did they say?",
  - a **Said by** dropdown (defaults to the viewer),
  - **Save** (disabled below 3 characters) and **Cancel**.
  - Success shows "Saved to the Memory Vault" and the card updates immediately. Errors from the server are shown as a toast.

### 5.8 Time together

Up to two small, dated suggestions from the Connection agent, each with overlapping avatars of the two people, a date pill, and a sentence. The section is hidden if there are none. They are triggered when two people have not shared a calendar event in a while (7 days; 14 during Ramadan and Eid), and the wording only states what the calendar shows, never anything about feelings.

---

## 6. Load `/load` and Resilience Mode

Title: **Who carries what**. Subtitle: the household's invisible work for the next 7 days.

### 6.1 Header buttons

| Button | What it does |
|---|---|
| **Recompute** | Re-runs the Load agent with a forced refresh: recalculates the numbers, rewrites the short summary, and refreshes proposals. The icon spins while it works. |
| **Stress test** (lime) | Scrolls down to Resilience Mode. |

If the written summary was unavailable, a note says so while stating that the numbers are still computed from your data.

### 6.2 The load field

A large WebGL picture of the household: each person is a glowing body, **larger and hotter with more load**, pink when overloaded.

- **Hover** a body to highlight it (and its row in the list).
- **Click** a body to choose them as the person who is away in Resilience Mode. Bodies are also reachable by keyboard (Tab, Enter).
- During a stress test the absent person's body **cools and fractures**, sparks mark everyone who inherits or loses work, and **light flows** from the absent person to each backup who steps in. The bodies resize to show what each present person *would* carry.
- Without WebGL2 it falls back to a gradient at the same positions; with reduced motion it shows one still frame. The canvas has a text description of the load for screen readers.

### 6.3 Load score list

Titled "Load score out of 100", with the dashed mark explained as the **burnout line, 75**. Sorted by hours, heaviest first. Each row shows:

- avatar, name, and a **Why?** popover listing the exact calendar events, medication rounds and obligations behind that person's number;
- hours and **score/100**;
- an animated bar with a dashed tick at 75.

Anyone at or over 75 gets a pink ring, a thicker bar and an **"Over the line, +N"** chip, and everyone else dims slightly so the eye lands on them. Hovering a row highlights that person's body in the picture.

A **pin** icon (top right of the card) pins "Load scores" to your Briefing.

### 6.4 The over-the-line profile

Appears only when someone is over the burnout line (Fatima in the demo). A pink panel with a large avatar, the agent's summary with names and figures colour-coded, and one button:

- **Stress-test without *name*:** chooses that person, runs the test immediately for the currently selected number of days, and scrolls to the results.

Four tiles: **Load score** (count-up, "+N over the line at 75"), **Hours this week** (with "a full week is 20 h"), **Share of the family's load** (%), and **Days since a rest block**.

### 6.5 Handoff inbox

The viewer's pending requests (section 11.2). Accepting one here triggers a flow of light between the two bodies and **automatically re-runs the stress test**, so you see the before/after at once.

### 6.6 Resilience Mode

Titled **What if someone is not here?** This is the centrepiece. Its own pin button pins "Stress test" to the Briefing.

**Controls**

| Control | Detail |
|---|---|
| **Who is away** | A radio group of avatar chips, one per member. A lime pill slides to the choice. Defaults to the heaviest-loaded person. |
| **How long** | A radio group: **3, 7, 14 or 30 days**. (The engine accepts any whole number from 1 to 60; the buttons offer these four presets.) |
| **Run the stress test** / **Run again** | Runs the simulation. Instant, and uses no model. A spinner shows while running. |

If you change the person or duration after a run, the old results fade and a note reads "These results are for *name* away *n* days. Run again to update them."

**Verdict card.** Either **"N tasks have nobody to do them"** with the day the first one is needed (and "by" rather than "on" when the date is approximate), or **"Nothing would be left undone."** If covering would push a present person past 75, their before and after scores are shown on twin bars. A note appears when the calendar does not reach the whole period.

**Result tabs** (only tabs with something to show appear):

| Tab | Shows |
|---|---|
| **How it unravels** (count) | A day-by-day timeline. Each day is a round "Day *n*" badge with its date; under it each failing task has a severity chip (**Urgent**: medication; **Important**: paperwork/obligations; **Routine**: events), the title, "(by day *n* at the latest)" for repeating or as-needed jobs, who it is for, the consequence, "It comes up *n* times" for repeats, and a **Why?** popover. As-needed medication (the EpiPen) fails from day one. |
| **Fragile spots** (count) | The **bus factor**: the fewest people any job depends on. A sentence says how many jobs rest on one person and who is the only one for how many, then a card per category (medical, school, admin, logistics, meals, social) with a bar and a **Why?** for the exposed jobs. |
| **Who steps in** (count) | Each covering person's load before and after, on twin bars against the dashed burnout line, and a list of what each named backup takes. |
| **Handover plan** | See below. |
| **Since the first run** | Appears only after something has changed (for example after you accepted a request): three rows with **before → after** values: tasks nobody can do, jobs resting on one person, and the absent person's load. Better values are green, worse are pink. |

**Handover plan**

- **Draft the handover plan** (button; disabled if there are no failures). Code picks who: the lowest-loaded present parent who stays under the burnout line (an event's own subject cannot cover it). Each placement is written as a **pending handoff request**, never a reassignment.
- Afterwards a line tells you exactly what happened ("Sent 6 requests to Salem. They wait in the inbox until answered; use Viewing as in the top bar to answer for them.") or that requests were already waiting.
- Cards, one per task: title; a status chip reading **Covered now** (green, once accepted), **Asked *name*** or **Needs someone outside the family**; numbered runbook steps; **Why?**.
- If a model reworded the steps, a note says so and that they were checked against the facts. If the wording step failed, the plain steps are shown.

---

## 7. Operations `/operations`

The week's calendar, meals and paperwork, split into four tabs so nothing needs a long scroll. The active tab lives in the address (`?tab=meals`), so links and the New menu can open the right one.

### 7.1 Header buttons

| Button | What it does |
|---|---|
| **Plan again** | Re-runs the Operations agent (forced). Reads "Working…" with a spinner meanwhile. |
| **Add event** (lime) | Opens the Add event dialog (7.6). |

If the model was unavailable, a line says "Showing the built-in plan. The model was unavailable: …". If the plan could not be made at all, a card explains why with a **Try again** button.

Every tab opens with a one-line description and a **pin button** that puts that tab on your Briefing.

### 7.2 Calendar tab (count badge = clashes)

Pin: **Calendar clashes**. Two cards:

**Coming up.** The next 14 events across the whole family, grouped by day ("Today", "Tomorrow", then weekday and date). Each row: time, a dot in the owner's colour, title, owner name, and a pink **Clashes** tag when relevant.

**Clashes.** A heading that reads "No clashes this week", "One clash to sort out" or "N clashes to sort out". Each clash is a card with the day, the people involved as colour-dotted chips, a plain description, a **Why?** popover, and a lightbulb-marked suggested fix (a free listed backup where one exists).

- **Mark as sorted:** removes the clash from the list with an animation and shows "Marked as sorted. Change the event in your calendar to apply the suggestion." This clears the clash flag **on screen only**; see section 14.

A clash means one of two things: it was flagged by the family, or the same responsible person has two events within 60 minutes of each other (checked over the next 8 days).

### 7.3 Meals tab

Pin: **Today's meals**. A card titled **This week's meals**, with a **Full plan →** link to `/operations/meal-plan`.

A seven-day grid, three meals a day. Each meal is a button showing the dish name and one dot per family member: **filled** = the dish suits them as served, **hollow** = they get a substitute. Every button also has a full spoken description for screen readers ("Suits everyone except Khalid, who get a different dish").

Click a meal for a dialog containing:
- the day and meal, and the dish name;
- every member with their dot, and for anyone it does not suit, **"gets *named substitute*"**;
- tags (for example Suhoor/Iftar in Ramadan), approximate calories per serving, and a one-line summary.

Close it with the **X**, the **Esc** key, or a click on the backdrop.

**How the plan is made:** the model writes a 7-day Gulf/Emirati plan from abstract constraints only (it never sees a diagnosis). Then code checks every dish against every person by keyword, recomputes who it suits (ignoring the model's own list), replaces non-halal dishes, and assigns a named, rotating substitute from an Emirati library to anyone excluded. If the model fails, a hand-written varied plan is used and marked Preview (or Demo).

### 7.4 Drop anything tab

Pin: **Drop anything** (shown as a full-width card on the Briefing). Turn a document into saved tasks and events, with you checking everything.

**Step 1: give it something**

| Control | Detail |
|---|---|
| **Choose a file** / drop zone | Accepts PDF, PNG, JPG, WebP, TXT or Markdown, **up to 8 MB**. The drop zone lights up as a file is dragged over it. In demo mode the file chooser is disabled and a note says "Demo mode runs no model, so files are off. Paste text instead." |
| **Paste text** box | For text. |
| **Read it** | Enabled once the pasted text is at least 8 characters. Shows "Reading *file name*…" while working. |

A privacy line on screen says the file or text is sent to an AI model (Gemini, or NVIDIA for text if Gemini is down) and Bayt does not keep the file. In demo mode: "The text stays on this computer."

**Step 2: review.** The heading says "Found *n* items in *source*". For each proposed item:

- a **checkbox** to include or skip it;
- an editable **title**;
- **Due/Date**, and **Time** for events;
- **Kind** (Task with a deadline / Event);
- **Category**;
- **Who does it** (a person chosen by you; if the document names someone, it says so; defaults to the viewer);
- **If it is missed** (for tasks);
- the **exact quoted words** from the document and "Counted as about *n* minutes of work".

Buttons: **Save *n* items** (disabled until every included item has a title, a valid date and an owner) and **Discard** ("Try something else" if nothing was found).

Saving shows "Saved *n* items. They now count in everyone's load." and refreshes the family and briefing. Nothing at all is written before this click.

**Safeguards.** Members reach the model as aliases (m1, m2), never real ids. Dates are read by code first. For text, any item whose quote is not actually in the source is dropped. Task type and task-versus-event are corrected by keyword rules (a model once filed school fees as events). Dates must be real and within -30 to +800 days. Up to 8 candidates per document and 12 per save. If the model fails on text, the built-in date reader is used and the screen says so.

### 7.5 School tab (count badge = emails + health notes)

Pin: **School notes**. **Bayt never sends anything.** You copy the text and send it yourself.

Two cards side by side:

**Emails to the school.** Each draft shows its subject, "About *person* · to *recipient*", and:
- **Read and edit** (disclosure): an editable text area (edits are for you; they are not saved back) and **Copy text**, which confirms "Copied. Paste it into your email."

**Health notes for school.** Template-based, written on this computer from the parent's own data, never sent to a model. Sorted by urgency, each labelled **Send soon** (pink), **Seasonal** or **Routine**, with the person, the `[School name]` placeholder and:
- **Read it** (disclosure), **Copy text**, and an **I sent it** checkbox to tick for your own tracking.

The three note types: severe nut-allergy protocol (mentions an expiring auto-injector when a matching task exists), ADHD scheduling suggestion (when a stimulant is on the medication list), and asthma dust-day precautions (in, or within 30 days of, dust season).

### 7.6 Add event dialog

Opened from the **New** menu or the **Add event** button.

| Field | Detail |
|---|---|
| **Event title** | Free text. |
| **Date & time** | Date-and-time picker. |
| **Category** | Education, Work, Health, Medical, Extracurricular, Social, Family, Caregiving, Travel, Chores. |
| **Family member** | Whose calendar it goes on. |

Buttons: **Cancel**, **Add Event** ("Saving…" while working). Empty fields show "Please fill in all fields." After a successful save the family data is reloaded (the server may have flagged a clash on **other** events too) and the Operations plan is re-run, so any new clash appears at once. Click outside the dialog or the **X** to close without saving.

### 7.7 Full meal plan `/operations/meal-plan`

A dedicated page: a **← Operations** link, the title "The week's meals", **Plan again**, the full seven-day grid (same clickable dishes), and a section **Who this plan is written around** listing each person's role, age, dietary needs and conditions as the planner sees them.

---

## 8. Health `/health` and `/health/[person]`

Health is for understanding, not diagnosing. Bayt tells you to ask the relevant clinician and never gives medical advice.

### 8.1 Overview

**Header button:** **Look again** (forces a fresh analysis; "Looking…" while working).

**Person cards.** One per family member, each a link to their own page. A card shows an avatar, name, role and age, a **status chip** (see below), the top flag in a sentence, and counts of **medications** and **visits**. The arrow slides on hover.

**Status chip.** Always an icon plus a word, never colour alone: **good**, **monitor** (yellow) or **alert** (pink). It is derived from lab results and risk flags.

**Tabs across the family:**

| Tab | Content |
|---|---|
| **Next 21 days** (count) | Pin: **Appointments**. Cards for upcoming medical appointments: date tile, title, day and time, "**For** *person*" and, if someone else takes them, "**Taken by** *person*", plus a **Clashes** tag when relevant. |
| **Medications** (count) | Pin: **Medications**. A pink line says how many medications have only one person who can give them. Then a card per medication (below). |
| **Family patterns** (count) | Cross-family findings, such as a shared out-of-range lab or the same condition in two generations. |

**Medication card:** name, dosage and frequency, the patient (in the family-wide view), then either **Takes it themselves** or **Given by *person* → backup *person***. A medication with no backup gets a pink outline and the words **No one else can give it**. Known interactions appear as "Watch for: …".

**Family pattern card:** severity (**Act soon**, **Worth a look**, **Good to know**), a title, the affected people, a description, and a lightbulb-marked recommendation. The model's own "confidence" figure is deliberately not shown, because nothing computes it.

If the Privacy Vault is on, this analysis runs on the local model. If the local model is offline, Bayt writes the summaries itself and says so ("Written on this computer from the records"); nothing is sent to the cloud.

### 8.2 A person's page `/health/[person]`

A **← Everyone** link, then:

1. **Header card:** large avatar, name, role and age, condition tags, and the status chip.
2. **To keep an eye on:** their risk flags as cards.
3. **Lab results:** sorted with out-of-range first. Each card has the test name and date, a status chip (**In range**, **Keep an eye on it**, **Out of range**), the value, a **range bar** showing where the value sits against its reference range (drawn only when the range can be parsed; blood pressure such as "135/85" stays as text), and the reference range in words.
4. **Medications:** the same cards as above, for this person.
5. **Family patterns that include *name*:** only the patterns that touch them.
6. **Wearable:** resting heart rate, sleep and steps, **clearly labelled "Simulated sample figures"**. Bayt is not connected to a wearable, and nothing else on the page uses these numbers.

An unknown address shows "We could not find that person."

### 8.3 Removed on purpose

Numeric "Health Twin" projections, a D3 health network, invented waveform charts, a model "confidence %", and fake "last synced" times were all removed because they were not real.

---

## 9. Settings `/settings`

Reached from **Family** in the rail. Title: **Settings**, "The *surname* household."

### 9.1 People

| Control | What it does |
|---|---|
| **Add someone** | Opens the Add member dialog. |
| **Pencil icon** beside a person | Opens that person's Edit dialog. |

Each row shows a colour dot, name, role, age and dietary needs.

**Add member dialog:** Full name, Age, Role (Parent / Child / Grandparent; defaults to Child), Dietary restrictions (type and press **Enter** or **comma**, or press **Add**; click the **×** on a chip to remove it). **Cancel** / **Add Member**. Requires a name and an age.

**Edit member dialog** (four tabs, plus **Cancel** and **Save Changes**; the **X** or a backdrop click closes without saving):

| Tab | Fields |
|---|---|
| **Profile** | Full name, Age, Role. |
| **Health** | Health conditions (chips), Risk flags (chips), and **Medications**: **Add** a row with name, dosage and frequency; the bin icon removes a row. |
| **Diet & Prefs** | Dietary restrictions, Food likes, Food dislikes (all chips), Additional notes. |
| **Calendar** | Their upcoming events with a bin icon to delete each one. |

Saving updates the person, closes the dialog and re-runs the Health agent so new conditions and medications appear in the analysis. These changes feed meals (dietary needs become constraints), health pages and school notes.

### 9.2 Privacy

- **Privacy Vault switch.** On means health analysis runs on a model on this computer and never falls back to the cloud. If that model is not running, a pink line says "The local model is not running, so Bayt is using its own summaries." The setting is saved and survives restarts.
- Three plain statements: meal plans and the load summary are written without diagnoses or medication names; calendar titles and documents you drop in can reach the AI model that reads them; everything Bayt stores lives in a database on this computer.

### 9.3 Today's season

The seasons active today (Ramadan, Dust season, Summer heat, Exam period, School holiday, or "Nothing special today") and any upcoming events with a countdown ("Eid al-Adha, in 12 days"). This is read-only; the seasons come from a dated calendar.

---

## 10. Pins: building your own Briefing

Pins let each person assemble the features they care about on their own Briefing. They are stored **in this browser, per "Viewing as" person**, so Salem's board and Fatima's board are different.

### 10.1 What can be pinned

| Pin | Where you can pin it from | What its card shows on the Briefing |
|---|---|---|
| **Load scores** | Load page | Everyone's score and bar, ranked, with a flame on anyone over the line. |
| **Calendar clashes** | Operations → Calendar | A count and the first two clashes. |
| **Today's meals** | Operations → Meals | Today's breakfast, lunch and dinner. |
| **Drop anything** | Operations → Drop anything | The full drop-a-document tool, embedded. |
| **Appointments** | Health → Next 21 days | The next three visits. |
| **Medications** | Health → Medications | Total count and how many have only one person who can give them. |
| **School notes** | Operations → School | Emails to send, health notes, and an urgent count. |
| **Stress test** | Resilience Mode | A prompt about the heaviest-loaded person and a **Run the test** link. |

Cards read only existing, already-computed data. The operations ones load today's stored plan if it is not already there.

### 10.2 Controls

- **Pin / Pinned button** on each source (a pin icon in compact places). Pinning shows a toast "*Title* is pinned to the Briefing" with an **Undo** action; unpinning likewise. Its state is shown in words, not just fill.
- **Add** (on the Briefing board): a menu of all eight with a checkbox each; click to toggle.
- **Empty board:** three one-click starters: **Pin today's meals**, **Pin calendar clashes**, **Pin drop anything**.
- **On each pinned card:** an **arrow** link opens the page the card comes from, and a **pin-off** button removes it.

---

## 11. Shared pieces: Why?, handoff inbox, Tabs

### 11.1 "Why?" (the evidence trail)

A small underlined **Why?** link appears next to priorities, clashes, load scores, stress-test failures, fragile-spot categories and handover steps. Clicking it opens a popover "Based on these records" listing the real records behind the statement: type (calendar event, medication, obligation, handoff), title, date and owner.

The server resolves each reference and **drops any id that does not exist**, so an invented source can never be shown. Medications appear as "Medication schedule", never by drug name. If the records are gone it says "These records no longer exist."

### 11.2 The handoff inbox (consent)

Appears on the Briefing and the Load page when a request is waiting for the person selected in **Viewing as**. It reads "Someone is asking for your help" (or "People are…"). Each request names who is asking, the task, and why. Three answers:

| Button | Effect |
|---|---|
| **Accept** | The task moves to you; the previous owner stays on as a **backup**, so it now has two people. Toast: "*Task* is now yours. *Name* stays on as backup." The load field animates a flow of light between the two bodies. |
| **Not now** | Nothing changes. Toast: "Declined. *Name* keeps *task*." The item is not proposed again for 3 days. |
| **Suggest someone else** | Opens a row of the other family members. Picking one closes the original request and sends a **fresh request** to that person, who must also accept. Toast: "Asked *name* instead." |

Requests are created in two places: when the daily briefing is written (Bayt proposes up to three tasks from whoever is over the burnout line to people who would stay under it and carry less), and when you **Draft the handover plan** in Resilience Mode. Pending requests count as if accepted when proposing more, so repeated runs never stack up.

### 11.3 Tabs

Pages with several unrelated parts use one tab bar and one panel at a time. Tabs work with the mouse or with **Left/Right arrow, Home and End**; a lime pill slides to the chosen tab and the panel fades; small badges show counts.

---

## 12. The engine under the screens

### 12.1 The load model (one source of truth)

Every number on every page comes from one function, so two screens can never disagree.

- **Window:** the next 7 days.
- **What counts:** an event only counts if someone owns it; a medication only counts if given by someone other than the patient; an open obligation always counts for its owner; one-off tasks count once they enter their lead window; recurring ones count by occurrences per week.
- **Minutes per task** come from a reference table labelled as **planning assumptions** (for example school run 35 min, appointment escort 120, renewal 150, medication dose 5, meal planning 90).
- **Outputs per person:** hours, a **score out of 100** (hours ÷ 20 h weekly capacity, capped), **share** of the family's load, hours by category (medical, school, admin, logistics, meals, social), and days without a rest block (capped at 30).
- **Constants:** weekly capacity 20 h; **burnout line 75**; baseline week 12 h.
- A care recipient who owns nothing carries little, however much care they need.

### 12.2 Resilience engine

- **Bus factor:** the fewest people any job depends on, overall and per category, with single points of failure listed.
- **Stress test:** walks every day of the absence and sorts each event, obligation and medication occurrence into *covered by a named backup who is present* or *failure*. Failures carry a severity (medication critical, obligation high, event medium), the first day they fail, hours of work needed, and a consequence. Repeated jobs are grouped.
- **Handover plan:** code decides who; an optional model call only rewords the runbook steps. Clinical items are described generically first, and the reworded text is discarded if it adds a number, uses a gendered pronoun, or strays from the requested task.

### 12.3 Priority ranking and the daily briefing

Conflicts, obligations, handoffs and burnout are ranked by severity × urgency × category weight (plus a bonus when there is no backup). The top item is "Today's priority".

**Persona by viewer** (never from a first name):

| Viewer | Tone |
|---|---|
| Grandparent | Simple, warm, reminders first, larger type, optional Arabic read-aloud. |
| Child under 13 | Very short, encouraging sentences. |
| Teenager | Friendly, peer-like. |
| The parent carrying the most load (score 50+) | Supportive. |
| Other parents | Direct, logistics first. |

### 12.4 Time Dividend

Hours of coordination Bayt took off the family in the last 7 days: clashes spotted (30 min each), the weekly meal plan (90), school drafts (12 each), handoffs arranged (20 each). It is the single hero number on the Briefing.

### 12.5 Connection and drift

Counts days since two people shared a calendar event (the same activity on both calendars, or one escorting the other) over 30 days. The threshold is 7 days (14 in Ramadan and Eid). It also finds the next free evening (after 17:00) for both. The model only words the suggestion.

### 12.6 Cultural and seasonal awareness

A dated table (2026 and 2027) drives: Ramadan meal mode (suhoor/iftar), Eid, Gulf dust season (1 Oct to 30 Nov), summer heat (1 Jun to 15 Sep), UAE school terms, exam periods and National Day. Islamic dates carry a plus-or-minus 3 day moon-sighting uncertainty; school terms are approximate. Effects include meal planning, a doubled drift threshold, softer connection wording, dust and heat notes, and the season chip in the top bar. Beyond 31 December 2027 the calendar is marked as not covered.

### 12.7 AI layer

- **Primary:** Gemini 2.5 Flash for every structured call.
- **Fallback:** NVIDIA Nemotron, used automatically on rate limit, quota, auth error or overload (text only).
- **Local:** Ollama, used only by the Privacy Vault.
- Every call goes through one wrapper that times out, falls back, **never throws**, and returns success or a clear error. Schema errors do not fail over. File input never falls back (the fallback model is text-only).
- **Faithfulness guards:** a model rewrite is accepted only if it keeps every number from the original, adds no new number, does not grow beyond 1.5× + 30 characters, and (for narratives) makes no comparison the code did not compute ("double", "half"…). Otherwise the plain, computed text is shown.

### 12.8 Agents

| Agent | Code does | Model does |
|---|---|---|
| **Operations** | Conflicts, school health briefs, meal validation | The 7-day meal plan (from constraints) and school email drafts |
| **Load (Caregiver)** | All numbers and proposals | A short narrative, accepted only if it adds no figure |
| **Connection** | Drift, evidence, free evenings, Memory Vault | Warm wording per pair |
| **Health** | Local summaries, shared-lab patterns | Cross-family patterns (cloud, or the local model under the Vault) |
| **Adaptive briefing** | Ranked items, persona, the one action | Greeting and rephrasing |
| **Orchestrator** | Runs the four in parallel, composes the briefing, creates pending handoffs | Optional wording pass |

Results are cached: a same-day run under 12 hours old is reused, so opening a page does not spend model quota. The re-run buttons (**Write it again**, **Recompute**, **Plan again**, **Look again**) force a new run.

### 12.9 Data freshness

The seeded demo data is anchored to today. When the day changes, Bayt re-anchors seeded events, tasks, memories and wearable timestamps (and re-applies accepted event handoffs), so the demo never looks stale. Rows you create yourself are untouched.

---

## 13. Modes: live, demo, vault

### 13.1 Live mode

All model features run. The System pill reads Working, Live or Preview.

### 13.2 Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`)

No model calls at all; every deterministic feature still runs on the seeded database. Differences you will see:

- The System pill reads **Demo**.
- The **Simulate date** control appears.
- Briefings show the plain (unworded) version.
- Drop anything accepts **pasted text only** and reads it with the built-in date reader; the file chooser is disabled.
- No Arabic read-aloud text is generated.

### 13.3 Privacy Vault

Switchable from the System pill or Settings. Three states:

| State | Meaning |
|---|---|
| **Cloud mode** | Health analysis uses Gemini. Button: **Use local vault**. |
| **Local vault active** | Health analysis runs on this machine; nothing health-related goes to the cloud. Button: **Use cloud**. |
| **Local model offline** | The vault is on but Ollama is not running, so health analysis is paused and Bayt writes summaries itself. It will **not** fall back to the cloud. |

The vault is **fail-closed**: if the setting cannot be read, it is treated as ON. Elsewhere, models receive abstract constraints and hours, never diagnoses or medication names.

### 13.4 Accessibility and motion

Reduced-motion preferences are honoured everywhere (still frames, static bars, no tape scrolling). Focus rings are visible; canvases carry text descriptions; status is never shown by colour alone; the Arabic font is loaded for Arabic text; larger type is used for grandparent viewers.

---

## 14. Things that behave differently than you might expect

These come straight from the code and are worth knowing before a demo.

1. **"Mark as sorted" on a clash is on-screen only.** It clears the clash flag in the page's memory and shows a toast; it does not change the stored calendar. Reloading brings a still-real clash back. To actually fix it, change the event.
2. **The Edit person dialog's Calendar tab deletes immediately.** The bin icon removes the event from the database straight away; it is not tied to **Save Changes** or **Cancel**, and there is no confirmation.
3. **The Edit dialog does not edit who gives a medication or who the backups are.** Those ownership links, and who owns which task, are changed through handoffs and the seed, not through Settings.
4. **Add event and Add member fall back to a local copy if saving fails.** The dialog still closes and the item shows on screen, but it is not in the database and will vanish on reload.
5. **Stress-test durations:** the buttons offer 3, 7, 14 and 30 days; the engine and the landing copy allow 1 to 60.
6. **Email and note edits are not saved.** Edits to a school email draft, and the "I sent it" tick, live only until you leave the page.
7. **Handoff requests are not created by opening a page.** They appear when the briefing is written (first visit or **Write it again**) or when you draft a handover plan.
8. **Only one season chip shows at a time** in the top bar, in the order Ramadan, Dust Season, Summer Heat, Exam Period, even if several apply (Settings lists all of them).
9. **Pins are per browser and per person.** They are not in the database and do not follow you to another device.
10. **The wearable block is simulated.** Bayt is connected to no wearable, calendar, WhatsApp or school portal.
11. **PDF and image reading** (via Gemini) and drag-and-drop have been built but not exercised end to end; the pasted-text path has.

---

## 15. The demo family

Fictional, set in the UAE, and deliberately unbalanced so every feature has real work to do.

| Person | Role, age | Notable (kept out of every public page and cloud prompt) |
|---|---|---|
| **Salem** | Parent, 45 | Type 2 diabetes, hypertension; low-sodium, low-glycemic meals |
| **Fatima** | Parent, 42 | Iron and vitamin D deficiency, gluten sensitivity; gluten-free meals. Carries the most load (about 88/100) and owns several tasks with no backup |
| **Layla** | Child, 16 | Mild asthma, vitamin D; vegetarian |
| **Khalid** | Child, 12 | ADHD, severe nut allergy |
| **Aisha** | Grandparent, 71 | Osteoporosis, hypertension, mild cognitive decline; soft, low-sodium meals |

The seeded week runs from 16 days back to 14 days ahead and includes a clash today (a contractor visit against a parent-teacher conference), physio against dentist, school pickups split between Fatima and Salem, and a trip day for Salem. Tasks include the residence visa, Emirates ID, Ejari, Mulkiya, DEWA, Salik, health insurance, school fees, Khalid's allergy plan, an EpiPen replacement, Layla's inhaler, weekday dinners and weekly meal planning.

**A good 90-second walkthrough:** open `/load`, run a **14-day** stress test on **Fatima** (9 tasks have nobody to do them; Salem would reach 88/100 covering). Open the **Handover plan** tab and **Draft the handover plan**. Switch **Viewing as** to **Salem**, open the Briefing, and **Accept** a request. Return to Load and read **Since the first run**.
