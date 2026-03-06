import Link from "next/link";
import { getAllPrompts, getInterviewPrepPrompts } from "@/lib/prompts";
import PromptLibraryBrowser from "@/components/prompt-library-browser";

export default async function PromptsPage() {
  const [allPrompts, interviewPrompts] = await Promise.all([
    getAllPrompts(),
    getInterviewPrepPrompts(),
  ]);

  // Generic prompts = everything NOT interview_prep
  const interviewIds = new Set(interviewPrompts.map((p) => p.id));
  const genericPrompts = allPrompts.filter((p) => !interviewIds.has(p.id));

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
          Prompt Library
        </span>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Prompt Library
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {allPrompts.length} prompts total
          </p>
        </div>

        <PromptLibraryBrowser
          interviewPrompts={interviewPrompts}
          genericPrompts={genericPrompts}
        />
      </main>
    </div>
  );
}
