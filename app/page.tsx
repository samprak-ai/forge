import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 px-4 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Forge
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            Sharpen your writing and speaking, every day.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Create account
          </Link>
        </div>
      </main>
    </div>
  );
}
