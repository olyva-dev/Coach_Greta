// The app mark: a "G" built as a progress ring, matching the ring gauges
// used throughout the app. Inherits currentColor so it works on any surface.
export function Logo({
  className,
  size = 24,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Coach Greta"
    >
      <path
        d="M 49.41 20.26 A 21 21 0 1 0 49.41 43.74 L 49.41 32 L 38.00 32"
        fill="none"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
