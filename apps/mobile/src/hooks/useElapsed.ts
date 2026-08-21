import { useEffect, useState } from 'react';

/** Ticks once a second while `startedAt` is set. Returns elapsed milliseconds. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return startedAt == null ? 0 : Math.max(0, now - startedAt);
}
