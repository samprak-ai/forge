import type { DimensionScore } from "@/lib/types";

type Rep = {
  id: string;
  type: string;
  prompt_id: string;
  score: number | null;
  dimensions: DimensionScore[] | null;
  created_at: string;
};

export default function ScoreHistory({ reps }: { reps: Rep[] }) {
  if (reps.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
        No practice reps yet. Start your first session!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reps.map((rep) => {
        const date = new Date(rep.created_at);
        const timeStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const hourStr = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        return (
          <div
            key={rep.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
                {rep.type}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {timeStr} &middot; {hourStr}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {rep.dimensions?.map((d) => (
                <div key={d.dimension} className="text-center">
                  <div className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {d.score}
                  </div>
                  <div className="text-[10px] capitalize text-zinc-400 dark:text-zinc-500">
                    {d.dimension.slice(0, 4)}
                  </div>
                </div>
              ))}

              <div className="border-l border-zinc-200 pl-4 dark:border-zinc-800">
                <div className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {rep.score ?? "—"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
