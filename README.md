# Bayt: The Family Operating System

# Link: https://bayt.reilabs.cc/

Bayt is an AI-powered family operating system designed as a dashboard to manage a family's daily life. It features AI agents operating across multiple facets of family coordination, including operations, health, connection, and caregiving. The demo utilizes mock data (seeded into SQLite) centered around the fictional Al-Salem family.

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` based on `.env.example` or inject the necessary keys:

   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
   NVIDIA_API_KEY=your_nemotron_key
   DATABASE_URL=file:./dev.db
   NEXT_PUBLIC_DEMO_MODE=true # Use true to bypass API limits and serve mock outputs
   ```

3. **Database Setup:**
   Run Prisma migrations and seed the initial mock data (the Al-Salem family):

   ```bash
   npx prisma migrate dev
   npm run seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).

## Demo Mode

If you want to run the project without consuming AI credits or hitting live generative backends, ensure `NEXT_PUBLIC_DEMO_MODE=true` is set. The agents will serve predefined mock outputs mimicking actual execution instantly.

## Tech Stack

- **Framework:** Next.js 15 App Router (TypeScript), React 19
- **Styling:** Tailwind CSS v4
- **AI Integration:** Vercel AI SDK (`ai`) + Google Gemini (`@ai-sdk/google`) / Nemotron Nano
- **Database / ORM:** Prisma 7 + `@prisma/adapter-better-sqlite3`
- **State Management:** Zustand 5
- **Visualizations:** Recharts, Framer Motion, D3
- **Icons & Typography:** `lucide-react`, Space Grotesk (display), Inter (body), JetBrains Mono (data)

## Project Structure

The project follows a modular, feature-based architecture utilizing the Next.js App Router paradigm.

### `app/`

Contains all the routing and core Next.js application entries:

- `page.tsx` & `onboarding/page.tsx`: Landing and initialization pages.
- `(dashboard)/`: The main authenticated app shell.
  - `layout.tsx`: Houses the sidebar, top navigation, and `FamilyHydrator` to populate the state.
  - `briefing/`: The central hero page presenting the synthesized AI briefing.
  - `operations/`, `health/`, `connection/`, `caregiver/`: Respective domain pages.
- `api/`: Backend API routes for database interactions (family management, events) and invoking AI agents. Includes the orchestrator route at `api/briefing/generate`.

### `components/`

React components categorized primarily by function/domain:

- `briefing/`: Specific UI blocks for the dashboard (e.g., `DailyBriefing`, `ActiveAlerts`, `TimeDividend`).
- `caregiver/` & `connection/` & `health/`: Domain-specific visualization widgets spanning from health twin charts to memory vaults.
- `layout/`: Top-level positioning shells (`Sidebar`, `TopBar`, `PageTransition`).
- `operations/`: Planners and administrative tables (`MealPlanGrid`, `FamilyAgenda`).
- `ui/`: Core design primitives (`Skeleton`, Error states, `sonner` toasts).

### `lib/`

The business logic, external integrations, and data handling libraries:

- `agents/`: The AI agent orchestration layer (`orchestrator.ts`, `health-agent.ts`, `operations-agent.ts`) that runs routines and formulates prompts.
- `ai/`: Configurations for LLM clients (`geminiFlash`, `nemotronNano`) and specific wrappers like `safe-generate.ts` for AI responses.
- `db/`: Prisma client singleton and database query helpers.
- `data/`: Mock structures and seeding scripts (`seed.ts`, `mock-family.ts`).
- `store/` _(Zustand state via `FamilyHydrator`)_ is used heavily here to wire backend to frontend.

### `store/`

Zustand-based global state repositories. Stores are flat and lightweight:

- `family-store.ts`: Current structural data of the family (members, preferences).
- `agent-store.ts`: Real-time metadata tracking agent workflow and execution steps.
- `briefing-store.ts`: Hydrated artifacts containing the latest daily AI synthesis.
