import Link from "next/link";
import { getPromptsForMockRound } from "@/lib/prompts";
import { createInterviewRound } from "@/lib/db";
import MockInterview from "@/components/mock-interview";

export default async function MockInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; role?: string }>;
}) {
  const params = await searchParams;
  const company = params.company;
  const role = params.role;

  if (!company || !role) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Forge
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-red-500">
            Missing company or role. Go back to the{" "}
            <Link href="/prompts" className="underline">
              Prompt Library
            </Link>{" "}
            and start a mock interview from a role.
          </p>
        </main>
      </div>
    );
  }

  const prompts = await getPromptsForMockRound(company, role, 6);

  if (prompts.length < 3) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Forge
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-sm text-zinc-500">
            Not enough questions for a mock interview ({prompts.length} found,
            need at least 3). Add more questions for{" "}
            <span className="font-medium">{company} — {role}</span> first.
          </p>
          <Link
            href="/prompts"
            className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
          >
            ← Back to Prompt Library
          </Link>
        </main>
      </div>
    );
  }

  // Create the interview round record
  const round = await createInterviewRound(company, role, prompts.length);

  // Extract shared context from the first prompt
  const firstPrompt = prompts[0];
  const companyPhilosophy =
    firstPrompt.context?.company_interview_philosophy || undefined;
  const resumeLeverageMap =
    firstPrompt.context?.resume_leverage_map || undefined;
  const gapMitigation = firstPrompt.context?.gap_mitigation || undefined;

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
          href="/prompts"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Back to Library
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Mock Interview
          </p>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {company} &middot; {role}
          </h1>
        </div>

        <MockInterview
          prompts={prompts}
          company={company}
          roleTitle={role}
          roundId={round.id}
          companyPhilosophy={companyPhilosophy}
          resumeLeverageMap={resumeLeverageMap}
          gapMitigation={gapMitigation}
        />
      </main>
    </div>
  );
}
