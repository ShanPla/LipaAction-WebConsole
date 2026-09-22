import { useEffect, useState } from "react";

// How often ages on screen ([5m ago], Median wait) are worked out again.
// Ages are computed in the browser from each report's exact submission time
// rather than taken from the server, because a page with nothing changing
// doesn't fetch, and ages formatted on the server froze at the last fetch.
export const AGE_TICK_MS = 30_000;

/**
 * A clock for those ages. null until mounted, so the first render uses the
 * server's own strings and matches its HTML; after that, Date.now(), updated
 * every `intervalMs`.
 */
export function useNow(intervalMs: number = AGE_TICK_MS): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
