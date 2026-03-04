import Link from "next/link";
import { getAllPrompts } from "@/lib/prompts";

export default async function PromptsPage() {
  const prompts = await getAllPrompts();

  const writingPrompts = prompts.filter((p) => p.type === "writing");
  const speakingPrompts = prompts.filter((p) => p.type === "speaking");

  const categories = [...new Set(prompts.map((p) => p.category))].sort();

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

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Prompt Library
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {prompts.length} prompts across {categories.length} categories
          </p>
        </div>

        {/* Writing prompts */}
        <section className="mb-10">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Writing ({writingPrompts.length})
          </h3>
          <div className="space-y-3">
            {writingPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {prompt.category}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {prompt.wordLimit} words
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {prompt.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Speaking prompts */}
        <section>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Speaking ({speakingPrompts.length})
          </h3>
          <div className="space-y-3">
            {speakingPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {prompt.category}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {prompt.timeLimitSeconds}s
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {prompt.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
