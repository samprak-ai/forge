# Forge — Communication OS

## What This App Does
A personal daily practice tool for professional writing and speaking.
Two core loops: (1) Writing practice with AI scoring, (2) Speaking practice with transcription + analysis.
Tracks growth over time via a skill radar and coaching notes.

## Tech Stack
- Next.js 14 (App Router), TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Storage)
- Claude API for AI scoring (model: claude-sonnet-4-6)
- OpenAI Whisper for speech-to-text
- Deployed on Vercel

## Project Structure
/app                → Next.js App Router pages
/app/api            → API routes (scoring, transcription, sessions)
/components         → Reusable UI components
/lib                → Supabase client, API helpers, types
/public             → Static assets

## Coding Conventions
- TypeScript strict mode
- Functional components only, no class components
- API routes return typed JSON responses
- Supabase queries via the server-side client (not client-side)
- All Claude API calls go through /app/api/score/route.ts

## Key Domain Concepts
- Session: one daily practice block (6 reps: 3 writing + 3 speaking)
- Rep: a single practice attempt (write or speak a response to a prompt)
- Score: 0–100 composite across 4 dimensions (clarity, structure, concision, persuasion/delivery)
- Skill: a tracked dimension that accumulates score history over time
- Streak: consecutive days with at least one completed session

## Database Tables (Supabase)
- users (id, email, created_at)
- sessions (id, user_id, date, completed_reps, total_reps)
- reps (id, session_id, type [writing|speaking], prompt_id, content, score, dimensions, created_at)
- prompts (id, type, category, text, word_limit, time_limit_seconds)
- skill_history (id, user_id, skill_name, score, recorded_at)

## Do Not
- Never use client-side Supabase for authenticated data fetches
- Never hardcode API keys — use environment variables
- Never store audio files in Supabase storage beyond 24hrs (privacy)
- Never output or commit .env.local
