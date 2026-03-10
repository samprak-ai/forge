"use client";

import { useState, useMemo } from "react";
import type { ProgressRep } from "@/lib/db";

// ── Dimension configs ───────────────────────────────────────────────
const WRITING_DIMS = ["clarity", "structure", "persuasion", "alignment"] as const;
const SPEAKING_DIMS = ["vocabulary", "confidence", "articulation", "alignment"] as const;

const DIM_COLORS: Record<string, string> = {
  clarity: "#6366f1",      // indigo
  structure: "#8b5cf6",    // violet
  persuasion: "#ec4899",   // pink
  vocabulary: "#06b6d4",   // cyan
  confidence: "#f59e0b",   // amber
  articulation: "#10b981", // emerald
  alignment: "#3b82f6",    // blue
  concision: "#a855f7",    // purple
  delivery: "#f97316",     // orange
};

type TimeRange = "7d" | "30d" | "90d" | "all";
type PracticeType = "all" | "writing" | "speaking";

// ── Helpers ─────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date) {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function trendArrow(values: number[]): { direction: "up" | "down" | "flat"; delta: number } {
  if (values.length < 3) return { direction: "flat", delta: 0 };

  // Compare average of first third vs last third
  const third = Math.max(1, Math.floor(values.length / 3));
  const firstAvg = values.slice(0, third).reduce((s, v) => s + v, 0) / third;
  const lastAvg = values.slice(-third).reduce((s, v) => s + v, 0) / third;
  const delta = Math.round(lastAvg - firstAvg);

  if (delta > 3) return { direction: "up", delta };
  if (delta < -3) return { direction: "down", delta };
  return { direction: "flat", delta: 0 };
}

// ── SVG Line Chart ──────────────────────────────────────────────────
function LineChart({
  dataPoints,
  dimensions,
  height = 200,
  width = 600,
}: {
  dataPoints: { date: string; scores: Record<string, number> }[];
  dimensions: readonly string[];
  height?: number;
  width?: number;
}) {
  if (dataPoints.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = 0;
  const maxScore = 100;

  // X positions
  const xStep = dataPoints.length > 1 ? chartW / (dataPoints.length - 1) : chartW / 2;

  // Y scale
  function yScale(v: number) {
    return chartH - ((v - minScore) / (maxScore - minScore)) * chartH;
  }

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={padding.left}
            y1={padding.top + yScale(v)}
            x2={padding.left + chartW}
            y2={padding.top + yScale(v)}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={0.5}
            strokeDasharray={v === 0 ? "none" : "4,4"}
          />
          <text
            x={padding.left - 8}
            y={padding.top + yScale(v)}
            textAnchor="end"
            dominantBaseline="central"
            className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
          >
            {v}
          </text>
        </g>
      ))}

      {/* X-axis labels (show max ~8 labels to avoid crowding) */}
      {dataPoints.map((dp, i) => {
        const labelInterval = Math.max(1, Math.floor(dataPoints.length / 8));
        if (i % labelInterval !== 0 && i !== dataPoints.length - 1) return null;
        return (
          <text
            key={i}
            x={padding.left + i * xStep}
            y={height - 6}
            textAnchor="middle"
            className="fill-zinc-400 text-[8px] dark:fill-zinc-500"
          >
            {formatDate(dp.date)}
          </text>
        );
      })}

      {/* Lines per dimension */}
      {dimensions.map((dim) => {
        const points = dataPoints
          .map((dp, i) => {
            const score = dp.scores[dim];
            if (score == null) return null;
            return { x: padding.left + i * xStep, y: padding.top + yScale(score) };
          })
          .filter(Boolean) as { x: number; y: number }[];

        if (points.length < 2) return null;

        const pathD = points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");

        return (
          <g key={dim}>
            <path
              d={pathD}
              fill="none"
              stroke={DIM_COLORS[dim] || "#6b7280"}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={2}
                fill={DIM_COLORS[dim] || "#6b7280"}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Overall Score Sparkline ─────────────────────────────────────────
function OverallSparkline({
  scores,
  width = 600,
  height = 80,
}: {
  scores: { date: string; score: number }[];
  width?: number;
  height?: number;
}) {
  if (scores.length < 2) return null;

  const padding = { top: 10, right: 20, bottom: 20, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = chartW / (scores.length - 1);

  function yScale(v: number) {
    return chartH - (v / 100) * chartH;
  }

  const points = scores.map((s, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + yScale(s.score),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Light grid */}
      {[25, 50, 75].map((v) => (
        <line
          key={v}
          x1={padding.left}
          y1={padding.top + yScale(v)}
          x2={padding.left + chartW}
          y2={padding.top + yScale(v)}
          className="stroke-zinc-200 dark:stroke-zinc-800"
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      ))}

      {/* Area */}
      <path
        d={areaD}
        className="fill-indigo-600/10 dark:fill-indigo-400/10"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        className="stroke-indigo-600 dark:stroke-indigo-400"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* End point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        className="fill-indigo-600 dark:fill-indigo-400"
      />
    </svg>
  );
}

// ── Trend Badge ─────────────────────────────────────────────────────
function TrendBadge({ direction, delta }: { direction: "up" | "down" | "flat"; delta: number }) {
  if (direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
        Stable
      </span>
    );
  }

  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        +{delta}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      {delta}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────
export default function ProgressTrends({
  reps,
  companies,
  roles,
}: {
  reps: ProgressRep[];
  companies: string[];
  roles: { company: string; role_title: string }[];
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [practiceType, setPracticeType] = useState<PracticeType>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Filter reps
  const filteredReps = useMemo(() => {
    const now = new Date();
    return reps.filter((r) => {
      // Time range
      if (timeRange !== "all") {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        if (daysBetween(new Date(r.created_at), now) > days) return false;
      }
      // Practice type
      if (practiceType !== "all" && r.type !== practiceType) return false;
      // Company
      if (selectedCompany && r.company !== selectedCompany) return false;
      // Role
      if (selectedRole && r.role_title !== selectedRole) return false;
      return true;
    });
  }, [reps, timeRange, practiceType, selectedCompany, selectedRole]);

  // Available roles for selected company
  const availableRoles = useMemo(() => {
    if (!selectedCompany) return roles;
    return roles.filter((r) => r.company === selectedCompany);
  }, [roles, selectedCompany]);

  // Determine which dimensions to show based on practice type and actual data
  const activeDimensions = useMemo(() => {
    if (practiceType === "writing") return WRITING_DIMS;
    if (practiceType === "speaking") return SPEAKING_DIMS;

    // For "all", find unique dimensions across filtered reps
    const dims = new Set<string>();
    for (const rep of filteredReps) {
      if (rep.dimensions) {
        for (const d of rep.dimensions) dims.add(d.dimension);
      }
    }
    // Return a sorted, deduplicated array
    const all = [...WRITING_DIMS, ...SPEAKING_DIMS];
    return all.filter((d) => dims.has(d));
  }, [practiceType, filteredReps]);

  // Aggregate data by date for charting (average scores per date)
  const chartData = useMemo(() => {
    const byDate: Record<string, { scores: Record<string, number[]>; overall: number[] }> = {};

    for (const rep of filteredReps) {
      const date = new Date(rep.created_at).toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { scores: {}, overall: [] };

      if (rep.score != null) byDate[date].overall.push(rep.score);

      if (rep.dimensions) {
        for (const d of rep.dimensions) {
          if (!byDate[date].scores[d.dimension]) byDate[date].scores[d.dimension] = [];
          byDate[date].scores[d.dimension].push(d.score);
        }
      }
    }

    // Average per date
    const dates = Object.keys(byDate).sort();
    return dates.map((date) => {
      const entry = byDate[date];
      const avgScores: Record<string, number> = {};
      for (const [dim, vals] of Object.entries(entry.scores)) {
        avgScores[dim] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      }
      const avgOverall = entry.overall.length > 0
        ? Math.round(entry.overall.reduce((s, v) => s + v, 0) / entry.overall.length)
        : 0;

      return { date, scores: avgScores, overall: avgOverall };
    });
  }, [filteredReps]);

  // Per-dimension trend analysis
  const dimensionTrends = useMemo(() => {
    const trends: Record<string, { direction: "up" | "down" | "flat"; delta: number; avg: number; latest: number }> = {};

    for (const dim of activeDimensions) {
      const values = chartData.map((d) => d.scores[dim]).filter((v) => v != null);
      const { direction, delta } = trendArrow(values);
      const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
      const latest = values.length > 0 ? values[values.length - 1] : 0;
      trends[dim] = { direction, delta, avg, latest };
    }

    return trends;
  }, [chartData, activeDimensions]);

  // Overall trend
  const overallTrend = useMemo(() => {
    const values = chartData.map((d) => d.overall).filter((v) => v > 0);
    const { direction, delta } = trendArrow(values);
    const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
    const latest = values.length > 0 ? values[values.length - 1] : 0;
    return { direction, delta, avg, latest };
  }, [chartData]);

  // Summary stats
  const totalReps = filteredReps.length;
  const writingReps = filteredReps.filter((r) => r.type === "writing").length;
  const speakingReps = filteredReps.filter((r) => r.type === "speaking").length;
  const uniqueDates = new Set(filteredReps.map((r) => new Date(r.created_at).toISOString().split("T")[0])).size;

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-3">
        {/* Time range */}
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === range
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {range === "all" ? "All" : range}
            </button>
          ))}
        </div>

        {/* Practice type */}
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {(["all", "writing", "speaking"] as PracticeType[]).map((type) => (
            <button
              key={type}
              onClick={() => setPracticeType(type)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                practiceType === type
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Company filter */}
        {companies.length > 0 && (
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setSelectedRole(""); // reset role when company changes
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* Role filter */}
        {availableRoles.length > 0 && (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="">All Roles</option>
            {availableRoles.map((r) => (
              <option key={`${r.company}:${r.role_title}`} value={r.role_title}>
                {r.role_title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{totalReps}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Total Reps</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{uniqueDates}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Practice Days</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{writingReps}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Writing</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">{speakingReps}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Speaking</p>
        </div>
      </div>

      {filteredReps.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No practice data yet for these filters. Complete some practice reps to see your progress trends!
          </p>
        </div>
      ) : (
        <>
          {/* ── Overall Score Trend ── */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Overall Score
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Average score per practice day
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {overallTrend.latest}
                </span>
                <TrendBadge direction={overallTrend.direction} delta={overallTrend.delta} />
              </div>
            </div>
            <OverallSparkline
              scores={chartData.map((d) => ({ date: d.date, score: d.overall }))}
            />
          </div>

          {/* ── Dimension Trends Chart ── */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Dimension Breakdown
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Score trends by skill dimension
              </p>
            </div>

            <LineChart
              dataPoints={chartData}
              dimensions={activeDimensions}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {activeDimensions.map((dim) => (
                <div key={dim} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: DIM_COLORS[dim] || "#6b7280" }}
                  />
                  <span className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                    {dim}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Per-Dimension Cards ── */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Skill Progress
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeDimensions.map((dim) => {
                const trend = dimensionTrends[dim];
                if (!trend) return null;

                return (
                  <div
                    key={dim}
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: DIM_COLORS[dim] || "#6b7280" }}
                        />
                        <span className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
                          {dim}
                        </span>
                      </div>
                      <TrendBadge direction={trend.direction} delta={trend.delta} />
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {trend.latest}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Latest</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                          {trend.avg}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Average</p>
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${trend.latest}%`,
                          backgroundColor: DIM_COLORS[dim] || "#6b7280",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
