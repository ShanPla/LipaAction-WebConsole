// Response-time arithmetic shared by the city's Agency response page and the
// barangay's monthly resolution-time report, so the two can never compute a
// median or a 95th percentile differently. Pure, and safe on either side.

/**
 * Below this many timings no 95th percentile is shown: with fewer, it would
 * only be the slowest one under another name.
 */
export const MIN_SAMPLES_FOR_P95 = 20;

export interface DurationSummary {
  // Whole minutes; null when there is no timing at all.
  median: number | null;
  // null below MIN_SAMPLES_FOR_P95 timings.
  p95: number | null;
  samples: number;
}

/**
 * Minutes from one timestamp to a later one. null when either is missing or
 * the order is impossible, which a hand-edited row can produce; a negative
 * time would drag every median down.
 */
export function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const diff = Date.parse(to) - Date.parse(from);
  if (Number.isNaN(diff) || diff < 0) return null;
  return diff / 60000;
}

export function summariseDurations(values: number[]): DurationSummary {
  if (values.length === 0) return { median: null, p95: null, samples: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  // Nearest-rank: the smallest timing at or above 95% of the others.
  const p95 =
    sorted.length >= MIN_SAMPLES_FOR_P95 ? sorted[Math.ceil(0.95 * sorted.length) - 1] : null;
  return {
    median: Math.round(median),
    p95: p95 === null ? null : Math.round(p95),
    samples: sorted.length,
  };
}
