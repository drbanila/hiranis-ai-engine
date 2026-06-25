'use client';

import { useEffect, useState } from 'react';

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' };

export default function PremiumDateTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="h-[152px] w-full max-w-[176px] animate-pulse rounded-[1.25rem] bg-gradient-to-br from-[#faf8f6] to-[#f5eef2]" />
    );
  }

  const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now);
  const dateLine = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const timeLine = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <div className="relative w-full max-w-[176px] overflow-hidden rounded-[1.25rem] p-[1px] shadow-[0_8px_32px_rgba(157,74,106,0.08),0_2px_8px_rgba(15,15,15,0.04)] sm:mx-0">
      <div
        className="absolute inset-0 rounded-[1.25rem] opacity-90"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,252,251,0.95) 0%, rgba(252,236,243,0.55) 48%, rgba(245,239,230,0.45) 100%)',
        }}
      />
      <div className="relative rounded-[1.2rem] bg-gradient-to-br from-white/92 via-[#fffcfb] to-[#faf3f6]/80 px-4 py-4 backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a87c]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9d6a82]">
            Today
          </p>
        </div>
        <p
          className="text-[1.42rem] font-semibold leading-none capitalize text-[#2a2226]"
          style={serif}
        >
          {dayName}
        </p>
        <p className="mt-2 text-[12px] leading-snug text-[#7a6e72]">{dateLine}</p>
        <div className="mt-3.5 border-t border-[#eadde3]/60 pt-3.5">
          <p
            className="tabular-nums text-[1.72rem] font-light tracking-[0.06em] text-[#5c3d4a]"
            style={serif}
          >
            {timeLine}
          </p>
        </div>
      </div>
    </div>
  );
}
