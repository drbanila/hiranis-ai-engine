/**
 * Hirani AI Engine — premium "H" monogram mark.
 * Geometric navy→violet gradient "H" with a small spark accent.
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

      {/* "H" — solid geometric mark */}
      {/* Left stem */}
      <rect x="10" y="9" width="5.5" height="30" rx="2.5" fill={`url(#${gid})`} />
      {/* Right stem */}
      <rect x="28" y="9" width="5.5" height="30" rx="2.5" fill={`url(#${gid})`} opacity="0.92" />
      {/* Crossbar */}
      <rect x="13.5" y="21.25" width="16.5" height="5" rx="2.5" fill={`url(#${gid})`} />

      {/* Spark accent — top right */}
      <path
        d="M38 8 L39 11 L42 12 L39 13 L38 16 L37 13 L34 12 L37 11 Z"
        fill="#7C5CE0"
      />
    </svg>
  );
}
