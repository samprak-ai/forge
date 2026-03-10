"use client";

import { useState } from "react";
import type { InterviewPrepPrompt } from "@/lib/prompts";
import type { ScoreResult } from "@/lib/types";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function ScoreBar({
  label,
  score,
  comment,
}: {
  label: string;
  score: number;
  comment: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {score}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500 dark:bg-indigo-400"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{comment}</p>
    </div>
  );
}

export default function InterviewWritingPractice({
  prompt,
  sessionId,
}: {
  prompt: InterviewPrepPrompt;
  sessionId: string;
}) {
  const [content, setContent] = useState("");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wordCount = countWords(content);
  const wordLimit = prompt.wordLimit > 0 ? prompt.wordLimit : 300;
  const overLimit = wordCount > wordLimit;

  async function handleSubmit() {
    setScoring(true);
    setError(null);

    try {
      const res = await fetch("/api/interview-score-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.text,
          promptId: prompt.id,
          content,
          sessionId,
          context: prompt.context || {},
        }),
      });

      if (!res.ok) throw new Error("Scoring failed");

      const data: ScoreResult = await res.json();
      setResult(data);
    } catch {
      setError("Failed to score your writing. Please try again.");
    } finally {
      setScoring(false);
    }
  }

  function resetPractice() {
    setContent("");
    setResult(null);
    setError(null);
    setScoring(false);
  }

  return (
    <div className="space-y-6">
      {/* Context hints */}
      {prompt.context && !result && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-green-700 dark:text-green-400">
              Leverage from resume
            </p>
            <p className="mt-1 text-sm text-green-800 dark:text-green-300">
              {prompt.context.leverage_from_resume}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Directional angle
            </p>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              {prompt.context.directional_angle}
            </p>
          </div>
        </div>
      )}

      {/* Writing area */}
      {!result && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={scoring}
            rows={10}
            placeholder="Write your answer here..."
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
          />

          <div className="flex items-center justify-between">
            <span
              className={`text-xs tabular-nums ${
                overLimit
                  ? "text-red-500"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {wordCount} / {wordLimit} words
            </span>

            <button
              onClick={handleSubmit}
              disabled={wordCount === 0 || scoring}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:hover:bg-indigo-500"
            >
              {scoring ? "Scoring..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Score feedback */}
      {result && (
        <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Overall score */}
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              {result.overall}
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Interview Writing Score
            </p>
          </div>

          {/* Dimension breakdown */}
          <div className="space-y-4">
            {result.dimensions.map((d) => (
              <ScoreBar
                key={d.dimension}
                label={d.dimension}
                score={d.score}
                comment={d.comment}
              />
            ))}
          </div>

          {/* Summary */}
          <p className="border-t border-zinc-100 pt-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {result.summary}
          </p>

          {/* Your written answer */}
          <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Your Written Answer
            </h3>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {content}
            </p>
          </div>

          {/* Try again */}
          <div className="flex justify-center pt-2">
            <button
              onClick={resetPractice}
              className="rounded-md border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
