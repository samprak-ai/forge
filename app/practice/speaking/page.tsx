import Link from "next/link";
import { getRandomPrompt } from "@/lib/prompts";
import { getOrCreateTodaySession } from "@/lib/db";
import SpeakingPractice from "@/components/speaking-practice";

export default async function SpeakingPracticePage() {
  const prompt = await getRandomPrompt("speaking");
  const session = await getOrCreateTodaySession();

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
          Speaking Practice &middot; Rep {session.completed_reps + 1} / {session.total_reps}
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <SpeakingPractice prompt={prompt} sessionId={session.id} />
      </main>
    </div>
  );
}
