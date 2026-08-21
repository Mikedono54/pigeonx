import { Square } from 'lucide-react';

const BARS = [
  0.26, 0.44, 0.34, 0.58, 0.42, 0.7, 0.5, 0.86, 0.62, 0.4, 0.74, 0.54, 0.92, 0.66, 0.48, 0.8, 0.56,
  0.36, 0.68, 0.46, 0.88, 0.6, 0.38, 0.72, 0.5, 0.3,
];

function Spectrum() {
  return (
    <div
      className="flex h-20 items-end gap-[3px] border border-line bg-alt p-2"
      role="img"
      aria-label="Output spectrum, energy concentrated near 18 kilohertz"
    >
      {BARS.map((h, i) => {
        const hi = Math.round(h * 100);
        const lo = Math.max(12, Math.round(h * 42));
        return (
          <span
            key={i}
            className="px-bar w-full bg-accent"
            style={
              {
                height: `${hi}%`,
                '--h-lo': `${lo}%`,
                '--h-hi': `${hi}%`,
                animation: `px-bar-h ${(1.3 + (i % 5) * 0.22).toFixed(2)}s ease-in-out ${(i * 0.06).toFixed(2)}s infinite`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-line px-3 py-2.5">
      <span className="px-label text-muted">{label}</span>
      <span className="text-[13px] text-ink">{value}</span>
    </div>
  );
}

/** Flat product frame: the Deterrent screen, no bezel, no curves. */
export function AppFrame({ id }: { id?: string }) {
  return (
    <div id={id} className="w-full max-w-[380px] border border-ink bg-bg">
      <div className="flex items-center justify-between border-b border-ink px-3 py-2">
        <span className="px-label text-muted">iOS / Android</span>
        <span className="px-label text-ink">Deterrent</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between border border-line bg-alt px-3 py-2.5">
          <span className="px-label text-success">Running</span>
          <span className="px-num text-[13px] text-success">12:40</span>
        </div>

        <div className="flex items-center justify-between gap-3 border border-line px-3 py-2.5">
          <span className="font-display text-[15px] font-semibold text-ink">Pigeon</span>
          <span className="px-label border border-accent px-2 py-1 text-accent">18 kHz</span>
        </div>

        <Spectrum />

        <Row label="Output" value="Phone speaker, up to 18 kHz" />

        <div className="flex h-11 items-center justify-center gap-2 border border-ink bg-ink text-[14px] font-medium text-bg">
          <Square size={13} fill="currentColor" strokeWidth={1.75} aria-hidden />
          Stop
        </div>
      </div>
    </div>
  );
}
