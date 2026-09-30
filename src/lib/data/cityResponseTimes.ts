import "server-only";
import { createClient } from "@/lib/supabase/server";
import { startOfManilaDay } from "@/lib/utils";

export interface DurationSummary {
  // Whole minutes; null when there is no timing at all.
  median: number | null;
  // null below CityResponseData.minSamplesForP95 timings, where a 95th
  // percentile would only be the slowest one under another name.
  p95: number | null;
  samples: number;
}

export interface AgencyResponse {
  agencyId: string;
  // null when the agency's name couldn't be read; the page says so.
  name: string | null;
  routed: number;
  // Neither acknowledged nor closed yet.
  awaitingAcknowledgement: number;
  // Closed with any outcome except out of scope.
  resolved: number;
  // Closed as out of scope: sent back, not fixed.
  returned: number;
  toAcknowledge: DurationSummary;
  toResolve: DurationSummary;
}

export interface CityResponseData {
  windowDays: number;
  since: string; // ISO instant the window starts
  agencies: AgencyResponse[];
  minSamplesForP95: number;
  limit: number;
  capped: boolean;
  loadFailed: boolean;
}

interface RoutingRow {
  agency_id: string;
  created_at: string;
  routed_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_outcome: string | null;
}

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SAMPLES_FOR_P95 = 20;
const ROW_LIMIT = 5000;

/**
 * The paper's Per-Agency Response Time view (A.5.2): for every routing in
 * the last 30 Manila days, how long each agency took to acknowledge it, and
 * how long from acknowledgement to resolution.
 *
 * The paper times acknowledgement from the auto-route. Automatic routing is
 * off, so every routing here is a desk's, and the clock starts when the
 * agency row was written (routed_at, or created_at where that is empty).
 * Out-of-scope closures are counted apart and kept out of the resolution
 * time: sending a report back is not fixing it.
 *
 * Only agency and time columns are read. agency_routing names no reporter,
 * and routed_by / supervisor_approved_by, which name officials, are left out.
 */
export async function getCityResponseTimes(): Promise<CityResponseData> {
  const since = new Date(startOfManilaDay().getTime() - (WINDOW_DAYS - 1) * DAY_MS).toISOString();
  const empty = (loadFailed: boolean): CityResponseData => ({
    windowDays: WINDOW_DAYS,
    since,
    agencies: [],
    minSamplesForP95: MIN_SAMPLES_FOR_P95,
    limit: ROW_LIMIT,
    capped: false,
    loadFailed,
  });

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agency_routing")
    .select("agency_id, created_at, routed_at, acknowledged_at, resolved_at, resolution_outcome")
    .gte("created_at", since)
    .limit(ROW_LIMIT);

  if (error || !data) {
    console.error("[city-response] load failed", error?.code, error?.message);
    return empty(true);
  }

  const rows = data as RoutingRow[];
  const byAgency = new Map<string, { rows: RoutingRow[] }>();
  for (const r of rows) {
    const group = byAgency.get(r.agency_id) ?? { rows: [] };
    group.rows.push(r);
    byAgency.set(r.agency_id, group);
  }

  const names = new Map<string, string | null>();
  if (byAgency.size > 0) {
    const { data: agencies, error: namesError } = await supabase
      .from("agencies")
      .select("id, name")
      .in("id", [...byAgency.keys()]);
    if (namesError) console.error("[city-response] agency names failed", namesError.code, namesError.message);
    for (const a of (agencies ?? []) as { id: string; name: string | null }[]) names.set(a.id, a.name);
  }

  const agencies = [...byAgency].map(([agencyId, { rows: group }]): AgencyResponse => {
    const toAcknowledge: number[] = [];
    const toResolve: number[] = [];
    let awaitingAcknowledgement = 0;
    let resolved = 0;
    let returned = 0;

    for (const r of group) {
      const outOfScope = r.resolution_outcome === "out-of-scope";
      if (!r.acknowledged_at && !r.resolved_at) awaitingAcknowledgement += 1;
      if (r.resolved_at) {
        if (outOfScope) returned += 1;
        else resolved += 1;
      }
      const ack = minutesBetween(r.routed_at ?? r.created_at, r.acknowledged_at);
      if (ack !== null) toAcknowledge.push(ack);
      if (!outOfScope) {
        const fix = minutesBetween(r.acknowledged_at, r.resolved_at);
        if (fix !== null) toResolve.push(fix);
      }
    }

    return {
      agencyId,
      name: names.get(agencyId) ?? null,
      routed: group.length,
      awaitingAcknowledgement,
      resolved,
      returned,
      toAcknowledge: summarise(toAcknowledge),
      toResolve: summarise(toResolve),
    };
  });

  agencies.sort(
    (a, b) => b.routed - a.routed || (a.name ?? "￿").localeCompare(b.name ?? "￿")
  );

  return { ...empty(false), agencies, capped: rows.length === ROW_LIMIT };
}

// Minutes from one timestamp to a later one. null when either is missing or
// the order is impossible, which a hand-edited row can produce; a negative
// time would drag every median down.
function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const diff = Date.parse(to) - Date.parse(from);
  if (Number.isNaN(diff) || diff < 0) return null;
  return diff / 60000;
}

function summarise(values: number[]): DurationSummary {
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
