import { useId } from 'react';
import { cn } from '../lib/cn';

const W = 600;
const H = 200;

/** A seamlessly-tiling wave path (integer cycle counts over its own width). */
function wavePath(amplitude: number, c1: number, c2: number, phase: number, yOffset: number) {
  const pts: string[] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = t * W * 2;
    const y =
      yOffset +
      Math.sin(t * Math.PI * 2 * c1 + phase) * amplitude +
      Math.sin(t * Math.PI * 2 * c2 + phase * 1.7) * (amplitude * 0.22);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

const LAYERS = [
  { amp: 26, c1: 2, c2: 6, phase: 0, y: 96, speed: 26, opacity: 0.55, width: 1.5 },
  { amp: 17, c1: 3, c2: 9, phase: 1.1, y: 104, speed: 19, opacity: 0.4, width: 1.2 },
  { amp: 34, c1: 1, c2: 4, phase: 2.3, y: 88, speed: 34, opacity: 0.28, width: 1 },
  { amp: 10, c1: 5, c2: 14, phase: 0.6, y: 112, speed: 15, opacity: 0.22, width: 1 },
];

export function WaveBackdrop({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
            <stop offset="28%" stopColor="#2DD4BF" stopOpacity="1" />
            <stop offset="68%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${id}-glow)`}>
          {LAYERS.map((l, i) => (
            <g
              key={i}
              style={{
                animation: `px-wave-scroll ${l.speed}s linear infinite`,
                willChange: 'transform',
              }}
            >
              <path
                d={wavePath(l.amp, l.c1, l.c2, l.phase, l.y)}
                fill="none"
                stroke={`url(#${id}-stroke)`}
                strokeWidth={l.width}
                strokeOpacity={l.opacity}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={wavePath(l.amp, l.c1, l.c2, l.phase, l.y)}
                transform={`translate(${W * 2} 0)`}
                fill="none"
                stroke={`url(#${id}-stroke)`}
                strokeWidth={l.width}
                strokeOpacity={l.opacity}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
