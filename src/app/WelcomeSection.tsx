import ResearchNewsStrip from './ResearchNewsStrip';
import WelcomeHeroRow from './WelcomeHeroRow';

export default function WelcomeSection() {
  return (
    <div className="flex animate-[fade-in_0.7s_ease-out] flex-col items-center justify-center text-center">
      <WelcomeHeroRow />

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
        Private Clinical Intelligence
      </p>

      <h1
        className="text-[2.15rem] font-semibold leading-[1.08] tracking-tight text-[#2a2226] sm:text-[2.9rem] md:text-[3.4rem]"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        Banu&apos;s{' '}
        <span className="bg-gradient-to-r from-[#9d4a6a] to-[#b76e8a] bg-clip-text text-transparent">
          AI Engine
        </span>
      </h1>

      <p className="mt-4 max-w-[29rem] text-[0.975rem] leading-relaxed text-neutral-500">
        A refined companion for patient care, gynaecology, and the latest in
        women&apos;s health — private, precise, and always at your side.
      </p>

      <ResearchNewsStrip />
    </div>
  );
}
