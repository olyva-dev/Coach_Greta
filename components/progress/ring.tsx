// Single value progress ring: one hue on a muted track, value as text
export function ProgressRing({
  fraction,
  label,
  sublabel,
  size = 72,
}: {
  fraction: number; // 0..1
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
          className="stroke-primary"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold">{label}</span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
