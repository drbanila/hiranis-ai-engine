/**
 * Warm neutral backdrop — subtle blush accent only at edges.
 */
export default function PremiumBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#faf9f8]" />

      <div
        className="absolute -left-[20%] -top-[10%] h-[70vh] w-[70vw] rounded-full opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 240, 238, 0.9) 0%, transparent 68%)',
        }}
      />
      <div
        className="absolute -right-[15%] top-[8%] h-[55vh] w-[50vw] rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(circle, rgba(252, 236, 242, 0.35) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute bottom-[-5%] left-[30%] h-[45vh] w-[55vw] rounded-full opacity-25"
        style={{
          background:
            'radial-gradient(circle, rgba(240, 235, 230, 0.8) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
