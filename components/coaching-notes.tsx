"use client";

import { useState } from "react";

export default function CoachingNotes() {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function loadNotes() {
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/coaching");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setNotes(data.notes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Weekly Coaching Notes
        </h3>
        {!loading && (
          <button
            onClick={loadNotes}
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {notes ? "Refresh" : "Generate"}
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Analyzing your week...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">
          Failed to load coaching notes. Try again.
        </p>
      )}

      {notes && !loading && (
        <div className="space-y-3">
          {notes.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {!notes && !loading && !error && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Click &quot;Generate&quot; to get your weekly coaching summary.
        </p>
      )}
    </div>
  );
}
