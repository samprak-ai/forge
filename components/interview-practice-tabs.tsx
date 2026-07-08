"use client";

import { useState } from "react";
import type { InterviewPrepPrompt } from "@/lib/prompts";
import InterviewWritingPractice from "@/components/interview-writing-practice";
import InterviewPractice from "@/components/interview-practice";
import ConversationalInterview from "@/components/conversational-interview";

type Mode = "write" | "speak" | "interview";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InterviewPracticeTabs({
  prompt,
  sessionId,
}: {
  prompt: InterviewPrepPrompt;
  sessionId: string;
}) {
  const [mode, setMode] = useState<Mode>("write");

  const timeLimit = prompt.timeLimitSeconds ?? 120;
  const wordLimit = prompt.wordLimit > 0 ? prompt.wordLimit : 300;

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-indigo-600 text-white dark:bg-indigo-500"
        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;

  return (
    <div className="space-y-6">
      {/* Question card — the Live Interview mode renders its own, so hide here */}
      {mode !== "interview" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {prompt.category}
          </span>
          <p className="mt-2 text-base font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
            &ldquo;{prompt.text}&rdquo;
          </p>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {mode === "write"
              ? `Target: ~${wordLimit} words`
              : `Time limit: ${formatTime(timeLimit)}`}
          </p>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button onClick={() => setMode("write")} className={tabClass(mode === "write")}>
          Write Answer
        </button>
        <button onClick={() => setMode("speak")} className={tabClass(mode === "speak")}>
          Speak Answer
        </button>
        <button
          onClick={() => setMode("interview")}
          className={tabClass(mode === "interview")}
        >
          Live Interview
        </button>
      </div>

      {/* Active mode */}
      {mode === "write" && (
        <InterviewWritingPractice prompt={prompt} sessionId={sessionId} />
      )}
      {mode === "speak" && (
        <InterviewPractice prompt={prompt} sessionId={sessionId} hideQuestionCard />
      )}
      {mode === "interview" && (
        <ConversationalInterview prompt={prompt} sessionId={sessionId} />
      )}
    </div>
  );
}
