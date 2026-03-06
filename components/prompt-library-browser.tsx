"use client";

import Link from "next/link";
import { useState } from "react";
import type { Prompt, InterviewPrepPrompt } from "@/lib/prompts";

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

export default function PromptLibraryBrowser({
  interviewPrompts,
  genericPrompts,
}: {
  interviewPrompts: InterviewPrepPrompt[];
  genericPrompts: Prompt[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Group interview prompts by company → role
  const interviewGrouped: Record<
    string,
    Record<
      string,
      {
        prompts: InterviewPrepPrompt[];
        philosophy: string;
        openingPitch: string;
      }
    >
  > = {};

  for (const p of interviewPrompts) {
    if (!interviewGrouped[p.company]) interviewGrouped[p.company] = {};
    if (!interviewGrouped[p.company][p.roleTitle]) {
      interviewGrouped[p.company][p.roleTitle] = {
        prompts: [],
        philosophy: p.context?.company_interview_philosophy || "",
        openingPitch: p.context?.opening_pitch || "",
      };
    }
    interviewGrouped[p.company][p.roleTitle].prompts.push(p);
  }

  // Group generic prompts by category
  const genericGrouped: Record<string, Prompt[]> = {};
  for (const p of genericPrompts) {
    const cat = p.category || "general";
    if (!genericGrouped[cat]) genericGrouped[cat] = [];
    genericGrouped[cat].push(p);
  }

  const companies = Object.keys(interviewGrouped).sort();
  const categories = Object.keys(genericGrouped).sort();

  return (
    <div className="space-y-3">
      {/* ── Interview Prep: one section per company ── */}
      {companies.map((company) => {
        const companyKey = `company:${company}`;
        const isCompanyExpanded = expanded.has(companyKey);
        const roles = interviewGrouped[company];
        const roleNames = Object.keys(roles).sort();
        const totalQuestions = roleNames.reduce(
          (sum, r) => sum + roles[r].prompts.length,
          0
        );

        return (
          <div
            key={companyKey}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Level 1: Company */}
            <button
              onClick={() => toggle(companyKey)}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <Chevron expanded={isCompanyExpanded} />
              <svg
                className="h-5 w-5 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {company} Roles
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                {roleNames.length}{" "}
                {roleNames.length === 1 ? "role" : "roles"} ·{" "}
                {totalQuestions} questions
              </span>
            </button>

            {isCompanyExpanded && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {roleNames.map((roleName) => {
                  const roleKey = `role:${company}:${roleName}`;
                  const isRoleExpanded = expanded.has(roleKey);
                  const roleData = roles[roleName];

                  return (
                    <div key={roleKey}>
                      {/* Level 2: Role */}
                      <button
                        onClick={() => toggle(roleKey)}
                        className="flex w-full items-center gap-3 border-t border-zinc-50 px-5 py-3 pl-12 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
                      >
                        <Chevron expanded={isRoleExpanded} />
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {roleName}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {roleData.prompts.length} questions
                        </span>
                      </button>

                      {isRoleExpanded && (
                        <div className="border-t border-zinc-50 bg-zinc-50/50 dark:border-zinc-800/50 dark:bg-zinc-950/30">
                          {/* Philosophy + Pitch */}
                          {(roleData.philosophy || roleData.openingPitch) && (
                            <div className="space-y-3 px-5 py-4 pl-20">
                              {roleData.philosophy && (
                                <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                    Interview Philosophy
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    {roleData.philosophy}
                                  </p>
                                </div>
                              )}
                              {roleData.openingPitch && (
                                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                                    Opening Pitch
                                  </p>
                                  <p className="mt-1 text-sm italic text-indigo-800 dark:text-indigo-300">
                                    &ldquo;{roleData.openingPitch}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Level 3: Questions */}
                          {roleData.prompts.map((prompt, i) => (
                            <div
                              key={prompt.id}
                              className="border-t border-zinc-100 px-5 py-4 pl-20 dark:border-zinc-800/50"
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white dark:bg-indigo-500">
                                  {i + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                    {prompt.category}
                                  </p>
                                  <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    &ldquo;{prompt.text}&rdquo;
                                  </p>
                                  {prompt.context && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <div className="rounded border border-green-200 bg-green-50 px-2.5 py-1.5 dark:border-green-900 dark:bg-green-950/30">
                                        <span className="text-[10px] font-medium text-green-700 dark:text-green-400">
                                          Leverage
                                        </span>
                                        <p className="text-xs text-green-800 dark:text-green-300">
                                          {prompt.context.leverage_from_resume}
                                        </p>
                                      </div>
                                      <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 dark:border-blue-900 dark:bg-blue-950/30">
                                        <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">
                                          Angle
                                        </span>
                                        <p className="text-xs text-blue-800 dark:text-blue-300">
                                          {prompt.context.directional_angle}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-3">
                                    <Link
                                      href={`/interview-prep/practice?promptId=${prompt.id}`}
                                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                    >
                                      Practice →
                                    </Link>
                                  </div>
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
            )}
          </div>
        );
      })}

      {/* ── Generic Prompts ── */}
      {genericPrompts.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Level 1: Generic Roles */}
          <button
            onClick={() => toggle("generic")}
            className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <Chevron expanded={expanded.has("generic")} />
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Generic Prompts
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"} ·{" "}
              {genericPrompts.length} prompts
            </span>
          </button>

          {expanded.has("generic") && (
            <div className="border-t border-zinc-100 dark:border-zinc-800">
              {categories.map((category) => {
                const catKey = `generic:${category}`;
                const isCatExpanded = expanded.has(catKey);
                const catPrompts = genericGrouped[category];

                return (
                  <div key={catKey}>
                    {/* Level 2: Category */}
                    <button
                      onClick={() => toggle(catKey)}
                      className="flex w-full items-center gap-3 border-t border-zinc-50 px-5 py-3 pl-12 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
                    >
                      <Chevron expanded={isCatExpanded} />
                      <span className="text-sm font-medium capitalize text-zinc-800 dark:text-zinc-200">
                        {category}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {catPrompts.length}
                      </span>
                    </button>

                    {isCatExpanded && (
                      <div className="border-t border-zinc-50 bg-zinc-50/50 dark:border-zinc-800/50 dark:bg-zinc-950/30">
                        {/* Level 3: Prompts */}
                        {catPrompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            className="border-t border-zinc-100 px-5 py-4 pl-20 dark:border-zinc-800/50"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase ${
                                  prompt.type === "writing"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                }`}
                              >
                                {prompt.type}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                  {prompt.text}
                                </p>
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                  {prompt.type === "writing"
                                    ? `${prompt.wordLimit} words`
                                    : `${prompt.timeLimitSeconds}s`}
                                </p>
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
          )}
        </div>
      )}
    </div>
  );
}
