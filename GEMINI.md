# Bayt Project Context

## Project Overview

**Bayt** (Arabic for house/home) is an AI-powered family and caregiving management platform. It uses specialized AI agents (Operations, Health, Connection, Caregiver) to analyze family data and synthesize personalized daily briefings, track health patterns, manage calendar conflicts, and provide relationship insights.

### Core Technologies

*   **Framework:** Next.js 15.5 (App Router) with React 19.
*   **Database:** Prisma ORM backed by SQLite (`better-sqlite3`).
*   **AI Integration:** Vercel AI SDK (`ai`), `@ai-sdk/google` (using Google Gemini Flash), and `@ai-sdk/openai`.
*   **State Management:** Zustand (global state) & SWR (data fetching).
*   **Styling & UI:** Tailwind CSS v4, Framer Motion (animations), Recharts / D3 (data visualization), Sonner (toast notifications), and Lucide React (icons).
*   **Validation:** Zod for structured AI output and data schema validation.

## Architecture

*   **AI Orchestration:** The core AI logic resides in `lib/agents/` (e.g., `orchestrator.ts`, `health-agent.ts`, `operations-agent.ts`). The orchestrator runs multiple agents (Health, Operations) in parallel, aggregates their outputs (along with pre-baked Connection and Caregiver data), and uses Gemini to synthesize a structured "Briefing" for the family.
*   **Database Schema:** The Prisma schema (`prisma/schema.prisma`) includes domains for `Family`, `FamilyMember`, `HealthProfile`, `Medication`, `CalendarEvent`, `MealPlan`, and `Briefing`.
*   **App Routing:** The `app/` directory uses Next.js App Router, featuring a dashboard with sections for `briefing`, `caregiver`, `connection`, `health`, and `operations`.

## Building and Running

*   **Install Dependencies:** Run `npm install` (or your preferred package manager).
*   **Database Setup:** Ensure the SQLite database is initialized and apply migrations if necessary. 
*   **Seed Data:** Run `npm run seed` to populate the database with mock family data (uses `tsx lib/data/seed.ts`).
*   **Development Server:** Run `npm run dev` (starts with Turbopack).
*   **Build:** Run `npm run build` to build the application for production.
*   **Start Production Server:** Run `npm run start`.
*   **Linting:** Run `npm run lint`.

## Development Conventions

*   **AI Tooling:** Utilize `safeGenerateObject` and Zod schemas to ensure predictable and type-safe outputs from LLMs. 
*   **Data Fetching:** Prefer Server Components where possible; use SWR for client-side data fetching and Zustand for complex client-side state.
*   **TypeScript:** Strictly typed; rely on Prisma generated types (e.g., `Family`, `BriefingData`) and shared types in `types/`.
