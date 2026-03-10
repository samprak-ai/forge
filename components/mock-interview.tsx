"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { InterviewPrepPrompt } from "@/lib/prompts";

type DimensionScore = {
  dimension: string;
  score: number;
  comment: string;
};

type PerQuestionScore = {
  question_index: number;
  overall: number;
  dimensions: DimensionScore[];
  summary: string;
};

type RoundResult = {
  round_score: number;
  readiness_verdict: string;
  strengths: string[];
  improvements: string[];
  summary: string;
  per_question_scores: PerQuestionScore[];
};

type TranscriptEntry = {
  promptId: string;
  question: string;
  transcript: string;
  context: {
    leverage_from_resume: string;
    directional_angle: string;
  };
};

type Stage =
  | "setup"
  | "recording"
  | "transcribing"
  | "transitioning"
  | "assessing"
  | "results";

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

export default function MockInterview({
  prompts,
  company,
  roleTitle,
  roundId,
  companyPhilosophy,
  resumeLeverageMap,
  gapMitigation,
}: {
  prompts: InterviewPrepPrompt[];
  company: string;
  roleTitle: string;
  roundId: string;
  companyPhilosophy?: string;
  resumeLeverageMap?: { experience: string; why_it_maps: string }[];
  gapMitigation?: { gap: string; strategy: string }[];
}) {
  const [stage, setStage] = useState<Stage>("setup");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [expandedQ, setExpandedQ] = useState<Set<number>>(new Set());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPrompt = prompts[currentIndex];
  const timeLimit = currentPrompt?.timeLimitSeconds ?? 120;
  const totalQuestions = prompts.length;

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-stop at time limit
  useEffect(() => {
    if (stage === "recording" && elapsed >= timeLimit) {
      stopRecording();
    }
  }, [elapsed, timeLimit, stage, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, []);

  function startMockInterview() {
    setStage("recording");
    setCurrentIndex(0);
    setTranscripts([]);
    setResult(null);
    setError(null);
    setTotalElapsed(0);

    // Start total timer
    totalTimerRef.current = setInterval(() => {
      setTotalElapsed((prev) => prev + 1);
    }, 1000);

    startRecordingForQuestion();
  }

  async function startRecordingForQuestion() {
    setError(null);
    chunksRef.current = [];
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await processQuestionAudio();
      };

      mediaRecorder.start();
      setStage("recording");

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("Could not access microphone. Please check permissions.");
    }
  }

  async function processQuestionAudio() {
    setStage("transcribing");

    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error("Transcription failed");

      const { text } = await transcribeRes.json();

      // Save transcript
      const entry: TranscriptEntry = {
        promptId: currentPrompt.id,
        question: currentPrompt.text,
        transcript: text,
        context: {
          leverage_from_resume:
            currentPrompt.context?.leverage_from_resume || "",
          directional_angle:
            currentPrompt.context?.directional_angle || "",
        },
      };

      const updatedTranscripts = [...transcripts, entry];
      setTranscripts(updatedTranscripts);

      // Check if there are more questions
      if (currentIndex + 1 < totalQuestions) {
        // Transition to next question
        setStage("transitioning");
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          startRecordingForQuestion();
        }, 2000);
      } else {
        // All questions done — assess the round
        if (totalTimerRef.current) {
          clearInterval(totalTimerRef.current);
          totalTimerRef.current = null;
        }
        await assessRound(updatedTranscripts);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("setup");
    }
  }

  async function assessRound(allTranscripts: TranscriptEntry[]) {
    setStage("assessing");

    try {
      const res = await fetch("/api/interview-round/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          questions: allTranscripts,
          company,
          role_title: roleTitle,
          company_interview_philosophy: companyPhilosophy,
          resume_leverage_map: resumeLeverageMap,
          gap_mitigation: gapMitigation,
        }),
      });

      if (!res.ok) throw new Error("Assessment failed");

      const data: RoundResult = await res.json();
      setResult(data);
      setStage("results");
    } catch {
      setError("Assessment failed. Your answers were recorded but could not be scored.");
      setStage("results");
    }
  }

  function toggleQuestion(idx: number) {
    setExpandedQ((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const progress = Math.min((elapsed / timeLimit) * 100, 100);

  const verdictColor: Record<string, string> = {
    "Interview Ready": "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
    "Almost Ready": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800",
    "Needs More Practice": "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  };

  // ─── Setup Screen ──────────────────────────────────────────────────────
  if (stage === "setup") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Mock Interview Round
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {company} &middot; {roleTitle}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {totalQuestions}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Questions
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatTime(totalQuestions * (timeLimit || 120))}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Est. Time
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatTime(timeLimit)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Per Question
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              How it works
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-indigo-700 dark:text-indigo-400">
              <li>
                &bull; Answer {totalQuestions} questions in sequence — no going
                back
              </li>
              <li>
                &bull; Each question has a {formatTime(timeLimit)} time limit
                with auto-stop
              </li>
              <li>
                &bull; No individual scores shown during the round — stay focused
              </li>
              <li>
                &bull; Holistic assessment with readiness score at the end
              </li>
            </ul>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={startMockInterview}
              className="rounded-md bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              Start Mock Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Recording / Transcribing / Transitioning ──────────────────────────
  if (
    stage === "recording" ||
    stage === "transcribing" ||
    stage === "transitioning"
  ) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Progress bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < currentIndex
                    ? "bg-green-500 dark:bg-green-400"
                    : i === currentIndex
                      ? "bg-indigo-600 dark:bg-indigo-400"
                      : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
          <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
            Total: {formatTime(totalElapsed)}
          </span>
        </div>

        {/* Question */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white dark:bg-indigo-500">
              {currentIndex + 1}
            </span>
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              of {totalQuestions}
            </span>
          </div>
          <p className="mt-3 text-base font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
            &ldquo;{currentPrompt.text}&rdquo;
          </p>
        </div>

        {/* Context hints */}
        {currentPrompt.context && stage === "recording" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-green-700 dark:text-green-400">
                Leverage
              </p>
              <p className="mt-1 text-xs text-green-800 dark:text-green-300">
                {currentPrompt.context.leverage_from_resume}
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Angle
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                {currentPrompt.context.directional_angle}
              </p>
            </div>
          </div>
        )}

        {/* Timer + controls */}
        <div className="space-y-4">
          {stage === "recording" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Recording
                </span>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatTime(elapsed)} / {formatTime(timeLimit)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            {stage === "recording" && (
              <button
                onClick={stopRecording}
                className="rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Done — Next Question
              </button>
            )}

            {stage === "transcribing" && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Transcribing your answer...
              </p>
            )}

            {stage === "transitioning" && (
              <div className="text-center">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Answer recorded!
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Next question in a moment...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Assessing ─────────────────────────────────────────────────────────
  if (stage === "assessing") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center space-y-4 py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-zinc-700 dark:border-t-indigo-400" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Analyzing your interview...
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Scoring {totalQuestions} questions holistically
        </p>
      </div>
    );
  }

  // ─── Results Screen ────────────────────────────────────────────────────
  if (stage === "results" && result) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Round Score */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Interview Readiness Score
          </p>
          <div className="mt-2 text-5xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {result.round_score}
          </div>
          <span
            className={`mt-3 inline-block rounded-full border px-4 py-1 text-sm font-medium ${
              verdictColor[result.readiness_verdict] || "bg-zinc-100 text-zinc-600"
            }`}
          >
            {result.readiness_verdict}
          </span>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {result.summary}
          </p>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            {totalQuestions} questions &middot; {formatTime(totalElapsed)} total
            time
          </p>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
              Strengths
            </h3>
            <ul className="mt-2 space-y-1.5">
              {result.strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-sm text-green-700 dark:text-green-400"
                >
                  &bull; {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              Areas to Improve
            </h3>
            <ul className="mt-2 space-y-1.5">
              {result.improvements.map((imp, i) => (
                <li
                  key={i}
                  className="text-sm text-yellow-700 dark:text-yellow-400"
                >
                  &bull; {imp}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Question Breakdown
            </h3>
          </div>
          {result.per_question_scores.map((qScore, i) => {
            const isExpanded = expandedQ.has(i);
            const transcript = transcripts[i];

            return (
              <div
                key={i}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <button
                  onClick={() => toggleQuestion(i)}
                  className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white dark:bg-indigo-500">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {transcript?.question
                        ? transcript.question.length > 60
                          ? transcript.question.slice(0, 60) + "..."
                          : transcript.question
                        : `Question ${i + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {qScore.overall}
                    </span>
                    <svg
                      className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 bg-zinc-50/50 px-5 py-4 dark:bg-zinc-950/30">
                    {/* Transcript */}
                    {transcript && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Your Answer
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {transcript.transcript}
                        </p>
                      </div>
                    )}

                    {/* Dimension scores */}
                    <div className="space-y-3">
                      {qScore.dimensions.map((d) => (
                        <ScoreBar
                          key={d.dimension}
                          label={d.dimension}
                          score={d.score}
                          comment={d.comment}
                        />
                      ))}
                    </div>

                    {/* Question summary */}
                    {qScore.summary && (
                      <p className="border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        {qScore.summary}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              setStage("setup");
              setTranscripts([]);
              setResult(null);
              setCurrentIndex(0);
              setTotalElapsed(0);
            }}
            className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Practice Again
          </button>
          <Link
            href="/prompts"
            className="rounded-md border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back to Questions
          </Link>
        </div>

        {/* Error if assessment failed but we still show results screen */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Fallback for results stage without result (error case)
  if (stage === "results" && !result) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 py-10 text-center">
        <p className="text-sm text-red-500">{error || "Assessment failed."}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              setStage("setup");
              setTranscripts([]);
              setResult(null);
              setCurrentIndex(0);
            }}
            className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Try Again
          </button>
          <Link
            href="/prompts"
            className="rounded-md border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Back to Questions
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
