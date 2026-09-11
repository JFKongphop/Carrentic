/**
 * The Carrentic mark: a "C" ring, inlined so it takes the current text color
 * (the surrounding box supplies the background). Export name kept as OlLogo so
 * existing imports (rail, splash) need no change.
 */
export function OlLogo({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      {/* An open ring — the long arc through the left, leaving a gap on the
          right, reads as a "C". */}
      <path
        d="M178.8 71.5A76 76 0 1 0 178.8 184.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="34"
        strokeLinecap="round"
      />
    </svg>
  );
}
