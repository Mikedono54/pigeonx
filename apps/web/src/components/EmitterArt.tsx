/** PigeonX emitter: a flat line drawing. Square corners, one stroke weight. */
export function EmitterArt({ className }: { className?: string }) {
  const grille: Array<[number, number]> = [];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 6; c += 1) {
      grille.push([70 + c * 12, 68 + r * 12]);
    }
  }

  return (
    <svg
      viewBox="0 0 300 200"
      className={className}
      role="img"
      aria-label="Line drawing of a wall mounted PigeonX emitter projecting sound"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* wall plate and arm */}
        <path d="M20 52 H32 V148 H20 Z" />
        <path d="M32 96 H56" />
        {/* housing */}
        <path d="M56 44 H186 V156 H56 Z" />
        <path d="M56 60 H186" />
        {/* grille panel */}
        <path d="M64 62 H148 V146 H64 Z" />
        {/* status marks */}
        <path d="M158 74 H176" />
        <path d="M158 84 H170" />
        <path d="M158 136 H176" />
        {/* sound arcs */}
        <path d="M204 66 a 46 46 0 0 1 0 68" strokeWidth="1.5" />
        <path d="M226 50 a 68 68 0 0 1 0 100" strokeWidth="1.5" />
        <path d="M248 34 a 90 90 0 0 1 0 132" strokeWidth="1.5" />
      </g>
      <g fill="currentColor">
        {grille.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="2" height="2" />
        ))}
      </g>
    </svg>
  );
}
