/**
 * The three lines of state every screen needs around an `../api` call.
 *
 * Not a data-fetching library and not trying to become one — no cache, no
 * deduping, no retries. Each screen owns its own load, and `reload()` is how a
 * mutation gets the list to catch up.
 */

import { useCallback, useEffect, useState } from "react";

export type Async<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  // The caller passes a fresh closure every render, so the dep list is the
  // contract for when to re-run — same bargain as useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useEffect(() => {
    let live = true;
    setLoading(true);

    run().then(
      value => {
        if (!live) return;
        setData(value);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );

    return () => {
      live = false;
    };
  }, [run, nonce]);

  return { data, error, loading, reload: useCallback(() => setNonce(n => n + 1), []) };
}
