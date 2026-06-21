/**
 * Banila AI Engine — premium "B" monogram mark.
 * Navy→violet gradient "B" letterform with a small spark accent.
 * No external assets, no heavy animation. Pass `pulse` for a very
 * subtle breathing effect while the assistant is generating.
 */
export default function HiraniLogo({
  size = 32,
  pulse = false,
  className = '',
}: {
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  // Unique gradient id so multiple instances on one page don't collide.
  const gid = `hae-grad-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${pulse ? 'hae-pulse' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C3557" />
          <stop offset="0.55" stopColor="#3B3F9E" />
          <stop offset="1" stopColor="#7C5CE0" />
        </linearGradient>
      </defs>

      {/* "B" — gradient letterform mark */}
      <text
        x="23"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="34"
        fontWeight="800"
        letterSpacing="-1"
        fill={`url(#${gid})`}
      >
        B
      </text>

      {/* Spark accent — top right */}
      <path
        d="M38 8 L39 11 L42 12 L39 13 L38 16 L37 13 L34 12 L37 11 Z"
        fill="#7C5CE0"
      />
    </svg>
  );
}
