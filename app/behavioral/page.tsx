import Link from "next/link";
import { BEHAVIORAL_CATEGORIES, BEHAVIORAL_QUESTIONS } from "@/lib/behavioral";
import BehavioralBrowser from "@/components/behavioral-browser";

export default function BehavioralPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href="/dashboard"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Forge
        </Link>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          Behavioral Practice
        </span>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Behavioral Interview Practice
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Classic behavioral questions organized by Amazon&apos;s Leadership
            Principles — a taxonomy that covers behavioral interviews at almost
            any company. {BEHAVIORAL_QUESTIONS.length} questions across{" "}
            {BEHAVIORAL_CATEGORIES.length} categories.
          </p>
        </div>

        <BehavioralBrowser categories={BEHAVIORAL_CATEGORIES} />
      </main>
    </div>
  );
}
