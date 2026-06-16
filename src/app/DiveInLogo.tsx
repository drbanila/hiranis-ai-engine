'use client';

import { useId } from 'react';

/**
 * Dive In ripple emblem — concentric rings emanating from a glowing core,
 * inspired by the "source ripple" motif. When `busy` is true the ripples keep
 * emanating outward (e.g. while the assistant is searching / generating).
 */
export default function DiveInLogo({
  size = 64,
  busy = false,
  className = '',
}: {
  size?: number;
  busy?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, '');
  const grad = `dl-grad-${uid}`;
  const glow = `dl-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient glow */}
      <circle cx="50" cy="50" r="48" fill={`url(#${glow})`} />

      {/* Static concentric rings — the logo at rest */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="2"
        opacity="0.22"
      />
      <circle
        cx="50"
        cy="50"
        r="28"
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="2.5"
        opacity="0.42"
      />

      {/* Emanating ripples — only while busy */}
      {busy && (
        <g>
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="2.5"
            className="dl-ripple"
          />
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="2.5"
            className="dl-ripple [animation-delay:600ms]"
          />
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="2.5"
            className="dl-ripple [animation-delay:1200ms]"
          />
        </g>
      )}

      {/* Core */}
      <circle
        cx="50"
        cy="50"
        r="11"
        fill={`url(#${grad})`}
        className={busy ? 'dl-core' : undefined}
      />
      <circle cx="50" cy="50" r="4.5" fill="#ffffff" opacity="0.92" />
    </svg>
  );
}
