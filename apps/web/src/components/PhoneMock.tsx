import { BluetoothConnected, ChevronLeft, Square, TriangleAlert, Wifi } from 'lucide-react';

const BARS = [
  0.28, 0.46, 0.62, 0.88, 0.54, 0.72, 0.95, 0.6, 0.4, 0.78, 0.52, 0.86, 0.66, 0.34, 0.58, 0.9,
  0.48, 0.7, 0.36, 0.82, 0.56, 0.44, 0.74, 0.3,
];

function Spectrum() {
  return (
    <div
      className="flex h-24 items-end justify-between gap-[3px] rounded-[10px] border border-white/[0.07] bg-[#0A1120] px-3 py-3"
      role="img"
      aria-label="Live output spectrum, peaking near 18 kilohertz"
    >
      {BARS.map((h, i) => (
        <span
          key={i}
          className="w-full origin-bottom rounded-[2px]"
          style={{
            height: `${Math.round(h * 100)}%`,
            background:
              i > 15
                ? 'linear-gradient(180deg,#3B82F6 0%,#2563EB 100%)'
                : 'linear-gradient(180deg,#2DD4BF 0%,#14B8A6 100%)',
            animation: `px-bar ${(1.05 + (i % 6) * 0.19).toFixed(2)}s ease-in-out ${(i * 0.055).toFixed(2)}s infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}

export function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* ambient glow */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.28),rgba(59,130,246,0.14)_55%,transparent_78%)] blur-2xl"
        style={{ animation: 'px-pulse-glow 6s ease-in-out infinite' }}
      />

      <div className="rounded-[42px] border border-white/12 bg-gradient-to-b from-white/16 to-white/[0.03] p-[3px] shadow-[0_50px_90px_-40px_rgba(0,0,0,0.95)]">
        <div className="relative overflow-hidden rounded-[39px] border border-black/60 bg-[#080E1A]">
          {/* status bar */}
          <div className="relative flex items-center justify-between px-6 pt-3.5 pb-1 text-[11px] font-medium text-fg-muted">
            <span className="font-mono tracking-tight">7:42</span>
            <span
              aria-hidden
              className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black"
            />
            <span className="flex items-center gap-1.5">
              <Wifi size={12} aria-hidden />
              <BluetoothConnected size={12} className="text-teal" aria-hidden />
              <span aria-hidden className="ml-0.5 h-2.5 w-5 rounded-[3px] border border-current px-px">
                <span className="block h-full w-3/4 rounded-[1px] bg-current" />
              </span>
            </span>
          </div>

          {/* app header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-fg-muted">
              <ChevronLeft size={15} aria-hidden />
            </span>
            <span className="font-display text-[13px] font-semibold text-fg">Deterrent</span>
            <span className="h-7 w-7" />
          </div>

          <div className="flex flex-col gap-3 px-5 pb-6">
            {/* status pill */}
            <div className="flex items-center justify-between rounded-full border border-success/25 bg-success/10 py-2 pr-3 pl-3.5">
              <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-success uppercase">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full bg-success"
                    style={{ animation: 'px-ring 1.9s ease-out infinite' }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                Running
              </span>
              <span className="font-mono text-[13px] font-medium text-success tabular-nums">12:40</span>
            </div>

            {/* profile card */}
            <div className="rounded-[14px] border border-white/[0.07] bg-[#101A2C] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[15px] font-semibold text-fg">Pigeon</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">Randomised sweep · Patio</p>
                </div>
                <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-1 font-mono text-[11px] font-medium text-teal">
                  18 kHz
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-[8px] bg-warning/[0.08] px-2 py-1.5">
                <TriangleAlert size={11} className="shrink-0 text-warning" aria-hidden />
                <span className="text-[10px] leading-tight font-medium text-warning">
                  Guests may hear this profile
                </span>
              </div>
            </div>

            <Spectrum />

            {/* output row */}
            <div className="flex items-center justify-between rounded-[12px] border border-white/[0.07] bg-[#101A2C] px-3.5 py-2.5">
              <span className="text-[11px] font-medium text-fg-muted">Output · Phone speaker</span>
              <span className="font-mono text-[11px] text-fg-muted">≤ 18 kHz</span>
            </div>

            {/* stop button */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-[16px] border border-danger/35 bg-danger/15 font-display text-[15px] font-semibold text-danger"
            >
              <Square size={14} fill="currentColor" aria-hidden />
              Stop
            </button>

            <span aria-hidden className="mx-auto mt-1 h-1 w-24 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
