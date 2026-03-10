# Forge — Communication OS

## What This App Does
A personal daily practice tool for professional writing and speaking.
Two core loops: (1) Writing practice with AI scoring, (2) Speaking practice with transcription + analysis.
Tracks growth over time via a skill radar and coaching notes.

## Tech Stack
- Next.js 16 (App Router, Turbopack), TypeScript
- Tailwind CSS v4 (CSS-first config via `@theme` in globals.css — no tailwind.config.ts)
- Supabase (Postgres + Auth + Storage)
- Claude API for AI scoring (model: claude-sonnet-4-6)
- OpenAI Whisper (`whisper-1`) for speech-to-text
- Deployed on Vercel (auto-deploys from GitHub `main` branch)
- GitHub repo: samprak-ai/forge (private)

## Project Structure
```
/app                    → Next.js App Router pages
/app/api/score          → Claude scoring API (writing + speaking)
/app/api/transcribe     → OpenAI Whisper transcription API
/app/api/coaching       → Claude coaching notes API
/app/auth/callback      → OAuth/email confirmation callback
/app/login              → Login page
/app/signup             → Signup page
/app/dashboard          → Main dashboard (auth required)
/app/practice           → Writing practice page (auth required)
/app/practice/speaking  → Speaking practice page (auth required)
/app/prompts            → Prompt library browser (auth required)
/components             → Reusable UI components
/lib                    → Supabase client, API helpers, types
/lib/supabase           → Server + client Supabase clients
/public                 → Static assets
```

## Key Files
- `lib/supabase/server.ts` — Server-side Supabase client (cookies-based)
- `lib/supabase/client.ts` — Browser-side Supabase client
- `lib/auth.ts` — Server actions: login, signup, logout
- `lib/db.ts` — Database helpers (sessions, reps, streaks, skill averages)
- `lib/prompts.ts` — Prompt fetching from Supabase (with fallback)
- `lib/types.ts` — Shared types (ScoreResult, DimensionScore, etc.)
- `middleware.ts` — Auth session refresh + route protection

## Components
- `components/writing-practice.tsx` — Textarea + word counter + scoring + feedback
- `components/speaking-practice.tsx` — MediaRecorder + timer + transcription + scoring
- `components/skill-radar.tsx` — Pure SVG 4-axis radar chart
- `components/score-history.tsx` — Recent reps list with dimension scores
- `components/coaching-notes.tsx` — On-demand AI coaching summary

## Coding Conventions
- TypeScript strict mode
- Functional components only, no class components
- API routes return typed JSON responses
- Supabase queries via the server-side client (not client-side)
- All Claude API calls go through /app/api/score/route.ts and /app/api/coaching/route.ts
- Tailwind v4: no config file, theme customization via `@theme inline` in `app/globals.css`

## Design System
- **Accent color:** Indigo (`indigo-600` light / `indigo-500` dark)
- **Primary buttons:** `bg-indigo-600 hover:bg-indigo-700` / `dark:bg-indigo-500 dark:hover:bg-indigo-400`
- **Secondary buttons:** Outlined with `border-zinc-300` (neutral)
- **Score bars:** `bg-indigo-600` fill on `bg-zinc-200` track
- **Radar chart:** `fill-indigo-600/15 stroke-indigo-600` polygon
- **Streak banner:** `bg-indigo-50 border-indigo-200` subtle wash
- **Focus rings:** `focus:border-indigo-600 focus:ring-indigo-600`
- **Backgrounds:** `bg-zinc-50` (light) / `bg-black` (dark)
- **Cards:** `bg-white border-zinc-200` / `dark:bg-zinc-900 dark:border-zinc-800`
- **Error states:** Red (`red-500/600/700`)
- **Success states:** Green (`green-50/700`)

## Key Domain Concepts
- Session: one daily practice block (6 reps: 3 writing + 3 speaking)
- Rep: a single practice attempt (write or speak a response to a prompt)
- Score: 0–100 composite across 4 dimensions (clarity, structure, concision, persuasion/delivery)
- Skill: a tracked dimension that accumulates score history over time
- Streak: consecutive days with at least one completed session

## Database Tables (Supabase)
- users (managed by Supabase Auth)
- sessions (id, user_id, date, completed_reps, total_reps)
- reps (id, session_id, type [writing|speaking], prompt_id, content, score, dimensions, created_at)
- prompts (id, type, category, text, word_limit, time_limit_seconds)
- skill_history (id, user_id, skill_name, score, recorded_at)
- All tables have RLS policies for user data isolation

## Auth Flow
- Email/password auth (email confirmation disabled)
- Middleware protects all routes except `/`, `/login`, `/signup`, `/auth`
- Server actions handle login/signup/logout with redirects
- Auth callback route at `/app/auth/callback` for OAuth/email flows

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `ANTHROPIC_API_KEY` — Claude API key
- `OPENAI_API_KEY` — OpenAI API key (for Whisper)

## Deployment
- Vercel auto-deploys from `main` branch on GitHub
- Supabase Site URL and Redirect URLs must match the Vercel production domain
- Keep `localhost:3000` redirect URL in Supabase for local dev

## Do Not
- Never use client-side Supabase for authenticated data fetches
- Never hardcode API keys — use environment variables
- Never store audio files in Supabase storage beyond 24hrs (privacy)
- Never output or commit .env.local
- Never use a tailwind.config.ts file — this project uses Tailwind v4 CSS-first config
