import DiveInLogo from "./DiveInLogo";

export default function WelcomeSection() {
  return (
    <div className="flex flex-col items-center justify-center text-center my-12 animate-[fade-in_0.6s_ease-out]">
      {/* Ripple source emblem */}
      <div className="mb-6">
        <DiveInLogo size={84} busy />
      </div>

      {/* Premium Typography Brand Header */}
      <h1 className="text-3xl font-black tracking-[0.25em] text-zinc-900 uppercase mb-2">
        Hirani&apos;s AI Engine
      </h1>

      {/* Muted Subtitle */}
      <p className="text-sm font-medium text-zinc-500 tracking-wide max-w-sm">
        Your ultimate Cloud Intelligence Core
      </p>
    </div>
  );
}
