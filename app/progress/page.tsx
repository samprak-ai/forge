import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth";
import { getProgressData, getProgressFilters } from "@/lib/db";
import ProgressTrends from "@/components/progress-trends";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [reps, filters] = await Promise.all([
    getProgressData(500),
    getProgressFilters(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href="/dashboard"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Forge
        </Link>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Practice Progress
            </h2>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Track your interview score trends over time
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            &larr; Dashboard
          </Link>
        </div>

        <ProgressTrends
          reps={reps}
          companies={filters.companies}
          roles={filters.roles}
        />
      </main>
    </div>
  );
}
