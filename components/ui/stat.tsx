import { cn } from "@/lib/utils";

// Stat card in the reference's shape: small icon and label on top, the
// value large below it, an optional mini chart anchored at the bottom.
// The value stays in text ink; these are unrelated metrics, not a series,
// so a hue per card would encode nothing.
export function StatTile({
  value,
  unit,
  label,
  icon,
  children,
  className,
}: {
  value: string | number;
  unit?: string;
  label: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-surface p-4",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon && <span className="text-volt [&_svg]:size-3.5">{icon}</span>}
        {label}
      </p>
      <p className="flex items-baseline gap-1">
        <span className="metric text-3xl font-bold text-foreground">
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </p>
      {children && <div className="mt-auto">{children}</div>}
    </div>
  );
}

// Compact bar chart. Bars that hit their target take the volt fill, the
// rest use a muted track colour that still reads as a bar, never a gap.
export function BarSpark({
  values,
  hits,
  height = 40,
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
              hit ? "bg-volt" : v > 0 ? "bg-track-filled" : "bg-surface-raised"
            )}
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

// Full circle progress ring, the reference's hero readiness dial.
export function RingGauge({
  fraction,
  value,
  caption,
  status,
  size = 180,
}: {
  fraction: number;
  value: string;
  caption?: string;
  status?: string;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${caption ?? ""} ${value} ${status ?? ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-surface-raised"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-volt"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {caption && (
          <span className="mb-1.5 text-[11px] text-muted-foreground">
            {caption}
          </span>
        )}
        <span className="metric text-5xl font-bold">{value}</span>
        {status && (
          <span className="mt-1.5 text-xs font-medium text-volt">{status}</span>
        )}
      </div>
    </div>
  );
}

// Small progress ring for challenge cards
export function ProgressRing({
  fraction,
  label,
  sublabel,
  size = 72,
}: {
  fraction: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}${sublabel ? `, ${sublabel}` : ""}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-surface-raised"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-volt"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="metric text-sm font-bold">{label}</span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Thick rounded progress bar
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
        "h-2.5 w-full overflow-hidden rounded-full bg-surface-raised",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-volt transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Weekly line chart: one series, so no legend box, the title names it.
export function LineChart({
  points,
  labels,
  height = 130,
}: {
  points: number[]; // 0..100
  labels: string[];
  height?: number;
}) {
  if (points.length === 0) return null;
  const w = 320;
  const padY = 12;
  // inset horizontally so the end-point marker is never clipped by the edge
  const padX = 6;
  const plotW = w - padX * 2;
  const plotH = height - padY * 2;
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + plotH * (1 - Math.max(0, Math.min(100, p)) / 100),
  }));
  const path = xy
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${w - padX},${height} L${padX},${height} Z`;
  const last = xy[xy.length - 1];

  return (
    <div className="flex gap-2">
      <div
        className="flex flex-col justify-between text-[10px] text-muted-foreground"
        style={{ height }}
        aria-hidden="true"
      >
        {[100, 75, 50, 25, 0].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          role="img"
          aria-label="Completion by day this week"
        >
          <defs>
            <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((t) => (
            <line
              key={t}
              x1={0}
              x2={w}
              y1={padY + plotH * (1 - t / 100)}
              y2={padY + plotH * (1 - t / 100)}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill="url(#lineFade)" />
          <path
            d={path}
            fill="none"
            className="stroke-volt"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* only the latest point is labelled, never every point */}
          <circle
            cx={last.x}
            cy={last.y}
            r={4}
            className="fill-volt stroke-surface"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] uppercase text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
