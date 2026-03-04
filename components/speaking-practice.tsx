"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Prompt } from "@/lib/prompts";
import type { ScoreResult } from "@/lib/types";

function ScoreBar({ label, score, comment }: { label: string; score: number; comment: string }) {
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
          className="h-1.5 rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-100"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{comment}</p>
    </div>
  );
}

type Stage = "ready" | "recording" | "transcribing" | "scoring" | "done";

export default function SpeakingPractice({ prompt, sessionId }: { prompt: Prompt; sessionId: string }) {
  const [stage, setStage] = useState<Stage>("ready");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timeLimit = prompt.timeLimitSeconds ?? 90;

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
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
    };
  }, []);

  async function startRecording() {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((t) => t.stop());
        await processAudio();
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

  async function processAudio() {
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
      setTranscript(text);

      // Now score
      setStage("scoring");

      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.text,
          promptId: prompt.id,
          content: text,
          wordLimit: 0,
          sessionId,
          type: "speaking",
          timeLimitSeconds: prompt.timeLimitSeconds,
        }),
      });

      if (!scoreRes.ok) throw new Error("Scoring failed");

      const data: ScoreResult = await scoreRes.json();
      setResult(data);
      setStage("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStage("ready");
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const progress = Math.min((elapsed / timeLimit) * 100, 100);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Prompt card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {prompt.category}
        </span>
        <p className="mt-2 text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
          {prompt.text}
        </p>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Time limit: {timeLimit} seconds
        </p>
      </div>

      {/* Recording controls */}
      <div className="space-y-4">
        {/* Timer bar */}
        {stage === "recording" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-500">Recording</span>
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

        {/* Buttons */}
        <div className="flex justify-center">
          {stage === "ready" && (
            <button
              onClick={startRecording}
              className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start Recording
            </button>
          )}

          {stage === "recording" && (
            <button
              onClick={stopRecording}
              className="rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Stop Recording
            </button>
          )}

          {stage === "transcribing" && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Transcribing your audio...
            </p>
          )}

          {stage === "scoring" && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Scoring your response...
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Transcript */}
      {transcript && stage === "done" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Transcript
          </h3>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {transcript}
          </p>
        </div>
      )}

      {/* Score feedback */}
      {result && (
        <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <div className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {result.overall}
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Overall Score
            </p>
          </div>

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

          <p className="border-t border-zinc-100 pt-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {result.summary}
          </p>
        </div>
      )}
    </div>
  );
}
