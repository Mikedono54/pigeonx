import { useCallback, useEffect, useRef, useState } from 'react';

export type Async<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
  /** Change what is on screen without a round trip. */
  set: (next: T) => void;
};

/**
 * Run a promise, keep the last good answer, and hand back a retry.
 * `deps` decides when it runs again.
 */
export function useAsync<T>(run: () => Promise<T>, deps: unknown[]): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    runRef
      .current()
      .then((value) => {
        if (!current || !alive.current) return;
        setData(value);
        setLoading(false);
      })
      .catch((err) => {
        if (!current || !alive.current) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, set: setData };
}
