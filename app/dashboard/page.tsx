import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth";
import { getSkillAverages, getRecentReps, getStreak } from "@/lib/db";
import SkillRadar from "@/components/skill-radar";
import ScoreHistory from "@/components/score-history";
import CoachingNotes from "@/components/coaching-notes";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [averages, reps, streak] = await Promise.all([
    getSkillAverages(),
    getRecentReps(15),
    getStreak(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Forge
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {user?.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        {/* Streak banner */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-4 dark:border-indigo-900 dark:bg-indigo-950/40">
          <span className="text-3xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {streak}
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              day streak
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {streak === 0
                ? "Complete a session today to start your streak!"
                : streak === 1
                  ? "You practiced today. Keep it going tomorrow!"
                  : `${streak} consecutive days of practice.`}
            </p>
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h2>
          <div className="flex gap-3">
            <Link
              href="/practice"
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Writing Practice
            </Link>
            <Link
              href="/practice/speaking"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Speaking Practice
            </Link>
            <Link
              href="/interview-prep"
              className="rounded-md border border-indigo-300 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
            >
              Interview Prep
            </Link>
            <Link
              href="/prompts"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Prompt Library
            </Link>
            <Link
              href="/progress"
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Progress
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Left column: Radar + Coaching */}
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Skill Radar
              </h3>
              <SkillRadar averages={averages} />
            </div>

            <CoachingNotes />
          </div>

          {/* Right column: Score History */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Recent Scores
            </h3>
            <ScoreHistory reps={reps} />
          </div>
        </div>
      </main>
    </div>
  );
}
