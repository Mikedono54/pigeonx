import { useId } from 'react';

/** Abstract PigeonX emitter: weatherproof housing, grille, status LED, output arcs. */
export function EmitterArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const dots: Array<[number, number]> = [];
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const x = 84 + c * 11;
      const y = 78 + r * 11;
      if (Math.hypot(x - 117, y - 111) <= 36) dots.push([x, y]);
    }
  }

  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label="Illustration of a PigeonX emitter with sound projecting outward"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22304F" />
          <stop offset="100%" stopColor="#131C31" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.65" />
          <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-led`}>
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* ambient glow */}
      <ellipse cx="150" cy="196" rx="96" ry="14" fill="#000" opacity="0.5" filter={`url(#${id}-soft)`} />

      {/* output arcs */}
      <g stroke="#2DD4BF" fill="none" strokeLinecap="round">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${196 + i * 22} ${72 - i * 12} a ${52 + i * 22} ${52 + i * 22} 0 0 1 0 ${
              (52 + i * 22) * 2
            }`}
            strokeWidth={1.6}
            strokeOpacity={0.5 - i * 0.13}
            style={{
              animation: `px-pulse-glow ${3.4 + i * 0.7}s ease-in-out ${i * 0.35}s infinite`,
            }}
          />
        ))}
      </g>

      {/* mounting arm */}
      <rect x="46" y="104" width="22" height="14" rx="5" fill="#1B2742" stroke="#243049" />
      <rect x="34" y="86" width="16" height="50" rx="6" fill="#151F36" stroke="#243049" />

      {/* housing */}
      <rect x="64" y="58" width="128" height="106" rx="26" fill={`url(#${id}-body)`} stroke="#2B3A5C" />
      <rect
        x="64.75"
        y="58.75"
        width="126.5"
        height="104.5"
        rx="25.25"
        fill="none"
        stroke={`url(#${id}-edge)`}
        strokeWidth="1.5"
      />

      {/* grille */}
      <circle cx="117" cy="111" r="40" fill="#0C1424" stroke="#243049" />
      <g fill="#2DD4BF" opacity="0.55">
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.9" opacity={0.35 + ((i * 37) % 60) / 100} />
        ))}
      </g>
      <circle cx="117" cy="111" r="12" fill="#101A2C" stroke="#2DD4BF" strokeOpacity="0.4" />
      <circle cx="117" cy="111" r="4" fill="#2DD4BF" opacity="0.8" />

      {/* status LED + label */}
      <circle cx="171" cy="80" r="9" fill={`url(#${id}-led)`} opacity="0.8" />
      <circle cx="171" cy="80" r="3" fill="#34D399" />
      <rect x="156" y="134" width="30" height="6" rx="3" fill="#243049" />
      <rect x="156" y="145" width="20" height="6" rx="3" fill="#1B2742" />
    </svg>
  );
}
