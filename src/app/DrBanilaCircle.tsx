'use client';

import Image from 'next/image';

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif' };

export default function DrBanilaCircle() {
  return (
    <div className="relative h-[152px] w-[152px] shrink-0">
      {/* Ambient depth — no visible ring */}
      <div
        className="absolute -inset-2 rounded-full opacity-60 blur-xl"
        style={{
          background:
            'radial-gradient(circle, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 45%, transparent 70%)',
        }}
      />

      <div className="relative h-full w-full overflow-hidden rounded-full shadow-[0_16px_48px_rgba(15,15,15,0.14),0_6px_16px_rgba(15,15,15,0.08)]">
        {/* Portrait — true colour, lifted contrast, no pink wash */}
        <Image
          src="/dr-banila-portrait.png"
          alt="Dr Banila"
          fill
          className="object-cover object-[center_24%] brightness-[1.06] contrast-[1.1] saturate-[1.08]"
          sizes="152px"
          priority
        />

        {/* Neutral cinematic vignette — top light, bottom depth for label */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/50" />

        {/* Bottom label plate — readable, not pink */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[44%] bg-gradient-to-t from-[#1a1416]/85 via-[#1a1416]/50 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center px-2 pb-2.5">
          <p
            className="select-none whitespace-nowrap text-center text-[1.38rem] font-semibold leading-none tracking-[0.03em] text-white sm:text-[1.48rem]"
            style={{
              ...serif,
              textShadow: '0 2px 14px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            Dr Banila
          </p>
        </div>

        {/* Subtle glass edge — premium, borderless */}
        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.06)]" />
      </div>
    </div>
  );
}
