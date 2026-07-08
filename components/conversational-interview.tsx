"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { InterviewPrepPrompt } from "@/lib/prompts";
import type { DimensionScore } from "@/lib/types";
import {
  computeDeliveryMetrics,
  aggregateDeliveryMetrics,
  paceLabel,
  type DeliveryMetrics,
  type WhisperSegment,
} from "@/lib/delivery";

const MAX_FOLLOWUPS = 2;

type Turn = {
  question: string;
  answer: string;
  metrics: DeliveryMetrics;
  isFollowup: boolean;
};

type Assessment = {
  overall: number;
  dimensions: DimensionScore[];
  summary: string;
  highlights: string[];
  improvements: string[];
};

type Stage =
  | "intro"
  | "asking" // interviewer TTS is (or should be) playing
  | "ready" // waiting for the candidate to start recording
  | "recording"
  | "thinking" // transcribing + deciding follow-up
  | "assessing"
  | "done"
  | "error";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

function MetricTile({
  value,
  label,
  hint,
  tone = "neutral",
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-green-600 dark:text-green-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-indigo-600 dark:text-indigo-400";
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/50">
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </p>
      {hint && (
        <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function ConversationalInterview({
  prompt,
  sessionId,
}: {
  prompt: InterviewPrepPrompt;
  sessionId: string;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(prompt.text);
  const [isFollowup, setIsFollowup] = useState(false);
  const [followupsAsked, setFollowupsAsked] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const [audioReady, setAudioReady] = useState(false); // TTS played ok
  const [muted, setMuted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Live refs so async callbacks read the latest values.
  const turnsRef = useRef<Turn[]>([]);
  const currentQuestionRef = useRef(prompt.text);
  const followupsRef = useRef(0);

  const timeLimit = prompt.timeLimitSeconds ?? 120;
  const ctx = prompt.context;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Speak text via OpenAI TTS. Resolves when playback finishes (or is skipped).
  const speak = useCallback(
    async (text: string) => {
      if (muted) {
        setAudioReady(true);
        return;
      }
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("tts failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().then(
            () => setAudioReady(true),
            () => {
              // Autoplay blocked — let the user read + replay manually.
              setAudioReady(false);
              resolve();
            }
          );
        });
      } catch {
        // TTS failed — fall back silently to the on-screen question text.
        setAudioReady(false);
      }
    },
    [muted]
  );

  const replayQuestion = useCallback(() => {
    void speak(currentQuestionRef.current);
  }, [speak]);

  // Present a question: show it, speak it, then move to "ready".
  const askQuestion = useCallback(
    async (question: string, followup: boolean) => {
      setCurrentQuestion(question);
      currentQuestionRef.current = question;
      setIsFollowup(followup);
      setStage("asking");
      await speak(question);
      setStage("ready");
    },
    [speak]
  );

  const startInterview = useCallback(async () => {
    setError(null);
    setResult(null);
    setTurns([]);
    turnsRef.current = [];
    setFollowupsAsked(0);
    followupsRef.current = 0;
    setElapsed(0);
    await askQuestion(prompt.text, false);
  }, [askQuestion, prompt.text]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearTimer();
  }, []);

  // Auto-stop at the time limit.
  useEffect(() => {
    if (stage === "recording" && elapsed >= timeLimit) {
      stopRecording();
    }
  }, [elapsed, timeLimit, stage, stopRecording]);

  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    if (audioRef.current) audioRef.current.pause();

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
        await processAnswer();
      };

      mediaRecorder.start();
      setStage("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setError("Could not access microphone. Please check permissions.");
    }
  }

  async function processAnswer() {
    setStage("thinking");
    const recordedElapsed = elapsed;

    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!transcribeRes.ok) throw new Error("Transcription failed");

      const {
        text,
        duration,
        segments,
      }: { text: string; duration: number | null; segments: WhisperSegment[] } =
        await transcribeRes.json();

      const metrics = computeDeliveryMetrics(
        text,
        duration ?? recordedElapsed,
        segments ?? []
      );

      const turn: Turn = {
        question: currentQuestionRef.current,
        answer: text,
        metrics,
        isFollowup,
      };
      const updatedTurns = [...turnsRef.current, turn];
      turnsRef.current = updatedTurns;
      setTurns(updatedTurns);

      // Decide whether to ask a follow-up.
      let followup: string | null = null;
      if (followupsRef.current < MAX_FOLLOWUPS) {
        try {
          const fRes = await fetch("/api/interview-followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalQuestion: prompt.text,
              history: updatedTurns.map((t) => ({
                question: t.question,
                answer: t.answer,
              })),
              followupsAsked: followupsRef.current,
              maxFollowups: MAX_FOLLOWUPS,
              context: {
                leverage_from_resume: ctx?.leverage_from_resume,
                directional_angle: ctx?.directional_angle,
                company_interview_philosophy: ctx?.company_interview_philosophy,
              },
            }),
          });
          if (fRes.ok) {
            const data = (await fRes.json()) as { followup: string | null };
            followup = data.followup;
          }
        } catch {
          followup = null; // fail safe — just wrap up
        }
      }

      if (followup) {
        followupsRef.current += 1;
        setFollowupsAsked(followupsRef.current);
        await askQuestion(followup, true);
      } else {
        await finishInterview(updatedTurns);
      }
    } catch {
      setError("Something went wrong processing your answer. Please try again.");
      setStage("ready");
    }
  }

  async function finishInterview(finalTurns: Turn[]) {
    setStage("assessing");
    const delivery = aggregateDeliveryMetrics(finalTurns.map((t) => t.metrics));

    try {
      const res = await fetch("/api/interview-conversation/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: prompt.id,
          sessionId,
          originalQuestion: prompt.text,
          turns: finalTurns.map((t) => ({
            question: t.question,
            answer: t.answer,
          })),
          delivery,
          context: ctx || {},
        }),
      });
      if (!res.ok) throw new Error("Assessment failed");
      const data = (await res.json()) as Assessment;
      setResult(data);
      setStage("done");
    } catch {
      setError(
        "Assessment failed — your answers were recorded but couldn't be scored."
      );
      setStage("done");
    }
  }

  function reset() {
    clearTimer();
    if (audioRef.current) audioRef.current.pause();
    setStage("intro");
    setCurrentQuestion(prompt.text);
    currentQuestionRef.current = prompt.text;
    setIsFollowup(false);
    setFollowupsAsked(0);
    followupsRef.current = 0;
    setTurns([]);
    turnsRef.current = [];
    setResult(null);
    setError(null);
    setElapsed(0);
  }

  const aggregate =
    turns.length > 0
      ? aggregateDeliveryMetrics(turns.map((t) => t.metrics))
      : null;
  const progress = Math.min((elapsed / timeLimit) * 100, 100);

  // ─── Intro ──────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
            Live Interview
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-indigo-700 dark:text-indigo-400">
            <li>&bull; The interviewer reads each question aloud — just listen</li>
            <li>
              &bull; Record your spoken answer; you may get up to{" "}
              {MAX_FOLLOWUPS} adaptive follow-ups based on what you say
            </li>
            <li>
              &bull; At the end you get scored on content <em>and</em> vocal
              delivery (pace, fillers, pauses)
            </li>
          </ul>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600 dark:border-zinc-700"
          />
          Mute interviewer voice (read questions on screen instead)
        </label>

        <div className="flex justify-center">
          <button
            onClick={startInterview}
            className="rounded-md bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ─── Assessing ──────────────────────────────────────────────────────────
  if (stage === "assessing") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-zinc-700 dark:border-t-indigo-400" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Analyzing your interview...
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Scoring content and vocal delivery
        </p>
      </div>
    );
  }

  // ─── Results ────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="space-y-6">
        {result ? (
          <>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Interview Readiness Score
              </p>
              <div className="mt-2 text-5xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {result.overall}
              </div>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {result.summary}
              </p>
            </div>

            {/* Delivery metrics */}
            {aggregate && (
              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Vocal Delivery
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricTile
                    value={`${aggregate.wpm}`}
                    label="words/min"
                    hint={paceLabel(aggregate.wpm)}
                    tone={
                      paceLabel(aggregate.wpm) === "conversational"
                        ? "good"
                        : "warn"
                    }
                  />
                  <MetricTile
                    value={`${aggregate.fillerCount}`}
                    label="filler words"
                    hint={`${aggregate.fillerPer100}/100 words`}
                    tone={aggregate.fillerPer100 > 4 ? "warn" : "good"}
                  />
                  <MetricTile
                    value={`${aggregate.longPauses}`}
                    label="long pauses"
                    hint=">2s"
                    tone={aggregate.longPauses > 3 ? "warn" : "good"}
                  />
                  <MetricTile
                    value={formatTime(aggregate.durationSec)}
                    label="speaking time"
                    hint={`${aggregate.words} words`}
                  />
                </div>
                {aggregate.fillerBreakdown.length > 0 && (
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Most frequent fillers:{" "}
                    {aggregate.fillerBreakdown
                      .slice(0, 5)
                      .map((f) => `“${f.word}” ×${f.count}`)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Dimensions */}
            <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              {result.dimensions.map((d) => (
                <ScoreBar
                  key={d.dimension}
                  label={d.dimension}
                  score={d.score}
                  comment={d.comment}
                />
              ))}
            </div>

            {/* Strengths & improvements */}
            {(result.highlights?.length || result.improvements?.length) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {result.highlights?.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                      Strengths
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {result.highlights.map((s, i) => (
                        <li
                          key={i}
                          className="text-sm text-green-700 dark:text-green-400"
                        >
                          &bull; {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.improvements?.length > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      Areas to Improve
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {result.improvements.map((s, i) => (
                        <li
                          key={i}
                          className="text-sm text-yellow-700 dark:text-yellow-400"
                        >
                          &bull; {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md bg-red-50 p-4 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error || "Assessment failed."}
          </div>
        )}

        {/* Conversation transcript */}
        {turns.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Full Exchange
              </h3>
            </div>
            <div className="space-y-4 p-5">
              {turns.map((t, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {t.isFollowup ? "Follow-up" : "Question"}
                  </p>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {t.question}
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {t.answer || <em>(no speech detected)</em>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={reset}
            className="rounded-md border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            New Interview
          </button>
        </div>
      </div>
    );
  }

  // ─── Active interview (asking / ready / recording / thinking) ────────────
  const turnLabel = isFollowup
    ? `Follow-up ${followupsAsked} of ${MAX_FOLLOWUPS}`
    : "Opening question";

  return (
    <div className="space-y-6">
      {/* Question card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
            {turnLabel}
          </span>
          {stage === "asking" && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              Interviewer speaking
            </span>
          )}
        </div>
        <p className="mt-2 text-base font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
          &ldquo;{currentQuestion}&rdquo;
        </p>
        {!muted && (stage === "asking" || stage === "ready") && (
          <button
            onClick={replayQuestion}
            className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            🔊 {audioReady ? "Replay question" : "Play question aloud"}
          </button>
        )}
      </div>

      {/* Context hints — only before recording, on the opening question */}
      {ctx && !isFollowup && (stage === "asking" || stage === "ready") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-green-700 dark:text-green-400">
              Leverage from resume
            </p>
            <p className="mt-1 text-sm text-green-800 dark:text-green-300">
              {ctx.leverage_from_resume}
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-[10px] font-medium uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Directional angle
            </p>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              {ctx.directional_angle}
            </p>
          </div>
        </div>
      )}

      {/* Timer while recording */}
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

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {stage === "asking" && (
          <button
            onClick={() => setStage("ready")}
            className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Skip audio — I&apos;m ready
          </button>
        )}
        {stage === "ready" && (
          <button
            onClick={startRecording}
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Start Answering
          </button>
        )}
        {stage === "recording" && (
          <button
            onClick={stopRecording}
            className="rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Done Answering
          </button>
        )}
        {stage === "thinking" && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Listening and thinking of a follow-up...
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
