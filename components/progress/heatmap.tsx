import { format, parseISO } from "date-fns";
import type { HeatmapCell } from "@/lib/data/progress";
import { cn } from "@/lib/utils";

// 12 week habit heatmap: columns are weeks, rows are days. Status colors
// carry win/lose, the legend below names them so color is never alone.
export function Heatmap({ cells }: { cells: HeatmapCell[] }) {
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${format(parseISO(cell.date), "MMM d")}: ${
                  cell.outcome === "before" ? "not tracked" : cell.outcome
                }`}
                className={cn(
                  "h-2.5 w-2.5 rounded-[3px]",
                  cell.outcome === "win" && "bg-primary",
                  cell.outcome === "lose" && "bg-destructive/70",
                  cell.outcome === "neutral" && "bg-surface-raised",
                  cell.outcome === "before" && "bg-surface-raised/40"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> win
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-destructive/70" /> miss
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-raised" /> off day
      </span>
    </div>
  );
}
