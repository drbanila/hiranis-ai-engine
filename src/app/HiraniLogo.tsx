/**
 * Banila AI Engine — premium rose-gold monogram.
 * Refined "B" with champagne spark accent. Pass `pulse` for subtle
 * breathing while the assistant generates.
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
        <linearGradient id={gid} x1="8" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7a3d58" />
          <stop offset="0.45" stopColor="#b76e8a" />
          <stop offset="1" stopColor="#c9a87c" />
        </linearGradient>
      </defs>

      <text
        x="23"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-cormorant), Georgia, 'Times New Roman', serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="-0.5"
        fill={`url(#${gid})`}
      >
        B
      </text>

      <path
        d="M38 8 L39 11 L42 12 L39 13 L38 16 L37 13 L34 12 L37 11 Z"
        fill="#c9a87c"
      />
    </svg>
  );
}
