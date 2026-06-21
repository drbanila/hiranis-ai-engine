import HiraniLogo from './HiraniLogo';

export default function WelcomeSection() {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-[fade-in_0.6s_ease-out]">
      <div className="mb-6 flex h-[104px] w-[104px] items-center justify-center rounded-full bg-gradient-to-b from-[#f0effb] to-transparent">
        <HiraniLogo size={68} />
      </div>

      <h1 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-[#1a1f2e] sm:text-[2.75rem] md:text-[3.25rem]">
        Banila AI Engine
      </h1>

      <p className="mt-4 max-w-[26rem] text-[0.95rem] leading-relaxed text-[#6b6f7d]">
        Private cloud intelligence for clear thinking,
        writing, and decisions.
      </p>
    </div>
  );
}
