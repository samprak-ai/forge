import type { SkillAverages } from "@/lib/db";

const DIMENSIONS = ["clarity", "structure", "concision", "persuasion"] as const;
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 75;
const LEVELS = 4;

function polarToCartesian(angle: number, radius: number) {
  // Start from top (-90°), go clockwise
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function getPolygonPoints(values: number[]) {
  const step = 360 / values.length;
  return values
    .map((v, i) => {
      const r = (v / 100) * RADIUS;
      const { x, y } = polarToCartesian(i * step, r);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function SkillRadar({ averages }: { averages: SkillAverages }) {
  const values = DIMENSIONS.map((d) => averages[d] ?? 0);
  const hasData = values.some((v) => v > 0);
  const step = 360 / DIMENSIONS.length;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-52 w-52">
        {/* Grid rings */}
        {Array.from({ length: LEVELS }, (_, i) => {
          const r = ((i + 1) / LEVELS) * RADIUS;
          const points = DIMENSIONS.map((_, j) => {
            const { x, y } = polarToCartesian(j * step, r);
            return `${x},${y}`;
          }).join(" ");
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {DIMENSIONS.map((_, i) => {
          const { x, y } = polarToCartesian(i * step, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon */}
        {hasData && (
          <polygon
            points={getPolygonPoints(values)}
            className="fill-indigo-600/15 stroke-indigo-600 dark:fill-indigo-400/15 dark:stroke-indigo-400"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {hasData &&
          values.map((v, i) => {
            const r = (v / 100) * RADIUS;
            const { x, y } = polarToCartesian(i * step, r);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={2.5}
                className="fill-indigo-600 dark:fill-indigo-400"
              />
            );
          })}

        {/* Labels */}
        {DIMENSIONS.map((dim, i) => {
          const { x, y } = polarToCartesian(i * step, RADIUS + 16);
          return (
            <text
              key={dim}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-zinc-500 text-[8px] capitalize dark:fill-zinc-400"
            >
              {dim}
            </text>
          );
        })}
      </svg>

      {/* Score legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {DIMENSIONS.map((dim) => (
          <div key={dim} className="flex items-center justify-between gap-3">
            <span className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
              {dim}
            </span>
            <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {averages[dim] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
