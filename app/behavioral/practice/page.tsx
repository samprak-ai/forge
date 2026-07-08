import Link from "next/link";
import { getBehavioralQuestionById } from "@/lib/behavioral";
import type { InterviewPrepPrompt } from "@/lib/prompts";
import { getOrCreateTodaySession } from "@/lib/db";
import InterviewPracticeTabs from "@/components/interview-practice-tabs";

function Shell({ children }: { children: React.ReactNode }) {
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
          href="/behavioral"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Back to Behavioral
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-6 py-10">{children}</main>
    </div>
  );
}

export default async function BehavioralPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <Shell>
        <p className="text-sm text-red-500">
          Missing question id. Go back to{" "}
          <Link href="/behavioral" className="underline">
            Behavioral Practice
          </Link>
          .
        </p>
      </Shell>
    );
  }

  const question = getBehavioralQuestionById(id);

  if (!question) {
    return (
      <Shell>
        <p className="text-sm text-red-500">
          Question not found.{" "}
          <Link href="/behavioral" className="underline">
            Back to Behavioral Practice
          </Link>
          .
        </p>
      </Shell>
    );
  }

  const session = await getOrCreateTodaySession();

  // Adapt the static behavioral question to the shape the practice tabs expect.
  // No resume context — these are generic questions — so context is null.
  const prompt: InterviewPrepPrompt = {
    id: question.id,
    type: "speaking",
    category: question.category,
    text: question.text,
    wordLimit: question.wordLimit,
    timeLimitSeconds: question.timeLimitSeconds,
    source: "behavioral",
    company: "",
    roleTitle: "",
    context: null,
  };

  return (
    <Shell>
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {question.category}
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {question.categoryBlurb}
        </p>
      </div>

      {question.isStar && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Structure your answer with STAR
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-800 dark:text-amber-300">
            <li>
              <strong>S</strong>ituation — set the context
            </li>
            <li>
              <strong>T</strong>ask — your specific responsibility
            </li>
            <li>
              <strong>A</strong>ction — what <em>you</em> did
            </li>
            <li>
              <strong>R</strong>esult — the outcome, ideally quantified
            </li>
          </ul>
        </div>
      )}

      <InterviewPracticeTabs prompt={prompt} sessionId={session.id} />
    </Shell>
  );
}
