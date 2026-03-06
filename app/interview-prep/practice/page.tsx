import Link from "next/link";
import { getInterviewPrepPromptById } from "@/lib/prompts";
import { getOrCreateTodaySession } from "@/lib/db";
import InterviewPractice from "@/components/interview-practice";

export default async function InterviewPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ promptId?: string }>;
}) {
  const params = await searchParams;
  const promptId = params.promptId;

  if (!promptId) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link
            href="/interview-prep"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Forge
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-red-500">
            Missing promptId. Go back to the{" "}
            <Link href="/interview-prep" className="underline">
              Interview Prep Library
            </Link>{" "}
            and select a question.
          </p>
        </main>
      </div>
    );
  }

  const prompt = await getInterviewPrepPromptById(promptId);

  if (!prompt) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link
            href="/interview-prep"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Forge
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-red-500">
            Prompt not found.{" "}
            <Link href="/interview-prep" className="underline">
              Back to Interview Prep Library
            </Link>
          </p>
        </main>
      </div>
    );
  }

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
        <Link
          href="/interview-prep"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Back to Library
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {prompt.company} · {prompt.roleTitle}
          </p>
        </div>

        <InterviewPractice prompt={prompt} sessionId={session.id} />
      </main>
    </div>
  );
}
