import type { DayBucket } from '../lib/derive';

/**
 * Seven days of plays as plain bars. No chart library: a grid of rectangles,
 * a baseline, and the number in the tooltip and the screen reader table.
 */
export function MiniBars({ buckets }: { buckets: DayBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 100;
  const height = 44;
  const gap = 2.5;
  const barWidth = (width - gap * (buckets.length - 1)) / buckets.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height + 1}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
        role="img"
        aria-label={`Plays per day: ${buckets.map((b) => `${b.label} ${b.count}`).join(', ')}`}
      >
        {buckets.map((b, i) => {
          const h = b.count === 0 ? 1 : Math.max(2, (b.count / max) * height);
          return (
            <rect
              key={b.key}
              x={i * (barWidth + gap)}
              y={height - h}
              width={barWidth}
              height={h}
              fill={b.count === 0 ? 'var(--px-line)' : 'var(--px-accent)'}
            >
              <title>{`${b.label}: ${b.count}`}</title>
            </rect>
          );
        })}
        <rect x={0} y={height} width={width} height={1} fill="var(--px-line)" />
      </svg>
      <div className="mt-2 flex justify-between">
        {buckets.map((b) => (
          <span key={b.key} className="px-label text-muted">
            {b.label.slice(0, 1)}
          </span>
        ))}
      </div>
    </div>
  );
}
