"use client";

import Link from "next/link";
import { useState } from "react";
import type { BehavioralCategory } from "@/lib/behavioral";

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function BehavioralBrowser({
  categories,
}: {
  categories: BehavioralCategory[];
}) {
  // Expand the first category by default so the section doesn't look empty.
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(categories.length > 0 ? [categories[0].name] : [])
  );

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const isExpanded = expanded.has(cat.name);
        return (
          <div
            key={cat.name}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              onClick={() => toggle(cat.name)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <Chevron expanded={isExpanded} />
              <div className="flex-1">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {cat.name}
                </span>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {cat.questions.length}{" "}
                {cat.questions.length === 1 ? "question" : "questions"}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                <p className="bg-zinc-50/60 px-5 py-3 pl-12 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-950/30 dark:text-zinc-400">
                  {cat.blurb}
                </p>
                {cat.questions.map((question, i) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 border-t border-zinc-100 px-5 py-4 pl-12 dark:border-zinc-800/50"
                  >
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white dark:bg-indigo-500">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        &ldquo;{question.text}&rdquo;
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {question.isStar && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            STAR
                          </span>
                        )}
                        <Link
                          href={`/behavioral/practice?id=${question.id}`}
                          className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                        >
                          Practice →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
