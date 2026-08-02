import { cn } from "@/lib/utils";

// Big number, small unit, label underneath, optional visual in the body.
// The layout the reference dashboard uses for every metric.
export function StatTile({
  value,
  unit,
  label,
  accent = "lime",
  children,
  className,
}: {
  value: string | number;
  unit?: string;
  label: string;
  accent?: "lime" | "primary" | "accent" | "gold" | "plain";
  children?: React.ReactNode;
  className?: string;
}) {
  const valueColor = {
    lime: "text-lime",
    primary: "text-primary",
    accent: "text-accent",
    gold: "text-gold",
    plain: "text-foreground",
  }[accent];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4",
        className
      )}
    >
      <div>
        <p className="flex items-baseline gap-1.5">
          <span className={cn("metric text-3xl font-bold", valueColor)}>
            {value}
          </span>
          {unit && (
            <span className="text-xs text-muted-foreground">{unit}</span>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
      {children}
    </div>
  );
}

// Compact bar chart, the reference's recurring motif. Bars that hit their
// target take the lime fill, the rest stay muted.
export function BarSpark({
  values,
  hits,
  height = 44,
}: {
  values: number[];
  hits?: boolean[];
  height?: number;
}) {
  const max = Math.max(1, ...values);
  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height }}
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const hit = hits?.[i] ?? v > 0;
        return (
          <div
            key={i}
            className={cn(
              "min-h-[3px] flex-1 rounded-[2px]",
              hit ? "bg-lime" : v > 0 ? "bg-primary/35" : "bg-surface-raised"
            )}
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

// Semicircle segmented gauge, as used for the reference's "70% excellent"
export function ArcGauge({
  fraction,
  label,
  caption,
  segments = 28,
}: {
  fraction: number;
  label: string;
  caption?: string;
  segments?: number;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const lit = Math.round(clamped * segments);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const height = cy + 10;

  return (
    <div className="relative mx-auto" style={{ width: size, height }}>
      <svg width={size} height={height} role="img" aria-label={`${label} ${caption ?? ""}`}>
        {Array.from({ length: segments }).map((_, i) => {
          // sweep 180 degrees, left to right
          const angle = Math.PI - (i / (segments - 1)) * Math.PI;
          const inner = 58;
          const outer = i < lit ? 84 : 76;
          const x1 = cx + Math.cos(angle) * inner;
          const y1 = cy - Math.sin(angle) * inner;
          const x2 = cx + Math.cos(angle) * outer;
          const y2 = cy - Math.sin(angle) * outer;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={5}
              strokeLinecap="round"
              className={i < lit ? "stroke-lime" : "stroke-surface-raised"}
            />
          );
        })}
      </svg>
      {/* sits in the hollow of the arc, clear of the segment ends */}
      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center leading-none">
        {caption && (
          <span className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {caption}
          </span>
        )}
        <span className="metric text-2xl font-bold">{label}</span>
      </div>
    </div>
  );
}

// Thick rounded progress bar with the signature gradient
export function GradientBar({
  fraction,
  className,
}: {
  fraction: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-surface-raised",
        className
      )}
    >
      <div
        className="gradient-lime h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
