"use client";

import Link from "next/link";
import { useState } from "react";
import type { InterviewPrepPrompt } from "@/lib/prompts";

type GroupedData = Record<
  string,
  {
    roles: Record<
      string,
      {
        prompts: InterviewPrepPrompt[];
        philosophy: string;
        openingPitch: string;
      }
    >;
  }
>;

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

export default function InterviewPrepBrowser({
  grouped,
}: {
  grouped: GroupedData;
}) {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    new Set()
  );
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  function toggleCompany(company: string) {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  }

  function toggleRole(key: string) {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const companies = Object.keys(grouped).sort();

  return (
    <div className="space-y-3">
      {companies.map((company) => {
        const companyData = grouped[company];
        const roleNames = Object.keys(companyData.roles).sort();
        const totalQuestions = roleNames.reduce(
          (sum, r) => sum + companyData.roles[r].prompts.length,
          0
        );
        const isCompanyExpanded = expandedCompanies.has(company);

        return (
          <div
            key={company}
            className="rounded-lg border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Company level */}
            <button
              onClick={() => toggleCompany(company)}
              className="flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <Chevron expanded={isCompanyExpanded} />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {company}
              </span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                {roleNames.length} {roleNames.length === 1 ? "role" : "roles"} ·{" "}
                {totalQuestions} questions
              </span>
            </button>

            {isCompanyExpanded && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {roleNames.map((roleName) => {
                  const roleKey = `${company}:${roleName}`;
                  const roleData = companyData.roles[roleName];
                  const isRoleExpanded = expandedRoles.has(roleKey);

                  return (
                    <div key={roleKey}>
                      {/* Role level */}
                      <button
                        onClick={() => toggleRole(roleKey)}
                        className="flex w-full items-center gap-3 border-t border-zinc-50 px-5 py-3 pl-10 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
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
                          {/* Philosophy + Opening Pitch */}
                          {(roleData.philosophy || roleData.openingPitch) && (
                            <div className="space-y-3 px-5 py-4 pl-16">
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
                                    Opening Pitch — &quot;Tell me about
                                    yourself&quot;
                                  </p>
                                  <p className="mt-1 text-sm italic text-indigo-800 dark:text-indigo-300">
                                    &ldquo;{roleData.openingPitch}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Questions */}
                          {roleData.prompts.map((prompt, i) => (
                            <div
                              key={prompt.id}
                              className="border-t border-zinc-100 px-5 py-4 pl-16 dark:border-zinc-800/50"
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

                                  <div className="mt-3 flex items-center gap-3">
                                    <Link
                                      href={`/interview-prep/practice?promptId=${prompt.id}`}
                                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                    >
                                      Practice →
                                    </Link>
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                      ⏱ 2:00
                                    </span>
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
    </div>
  );
}
