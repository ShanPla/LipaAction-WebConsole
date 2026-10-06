import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parsePoint } from "@/lib/geo";
import type { ReportPosition } from "@/types";

/**
 * Reads incident_reports.geom for a set of reports, the same privacy rule
 * everywhere it's used: never for identity-withheld or discreet reporting
 * (the loop below marks those "hidden" without a query), never guessed at
 * for the rest (a report with no fix is "none", not silently dropped), and
 * "unavailable" rather than "none" when the read itself failed — a failed
 * lookup must not be mistaken for a report that truly carries no position.
 *
 * Shared by the queue (every pending/awaiting/routed report) and the Cluster
 * Explorer (a cluster's members), so the rule can't drift between the two
 * places a report's position reaches the browser.
 */
export async function loadPositions(
  supabase: ReturnType<typeof createClient>,
  reports: { id: string; identity_withheld: boolean; discreet_reporting: boolean }[],
  // Only in the server log, so an outage in one caller reads differently
  // from the other's.
  logTag: string
): Promise<Map<string, ReportPosition>> {
  const positions = new Map<string, ReportPosition>();
  const eligible: typeof reports = [];
  for (const r of reports) {
    if (r.identity_withheld === false && r.discreet_reporting !== true) eligible.push(r);
    else positions.set(r.id, { kind: "hidden" });
  }
  if (eligible.length === 0) return positions;

  // Ids per .in() request: they travel in the URL.
  const CHUNK = 100;
  const ids = [...new Set(eligible.map((r) => r.id))];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("incident_reports")
        .select("id, geom")
        .in("id", chunk)
        .eq("identity_withheld", false)
        .not("discreet_reporting", "is", true)
    )
  );
  const failed = results.find((res) => res.error || !res.data);
  if (failed) {
    console.error(`[${logTag}] positions load failed`, failed.error?.code, failed.error?.message);
    for (const r of eligible) positions.set(r.id, { kind: "unavailable" });
    return positions;
  }

  const found = new Map<string, { lat: number; lng: number } | null>();
  for (const row of results.flatMap((res) => (res.data ?? []) as { id: string; geom: unknown }[])) {
    found.set(row.id, parsePoint(row.geom));
  }
  for (const r of eligible) {
    if (!found.has(r.id)) {
      positions.set(r.id, { kind: "hidden" });
      continue;
    }
    const point = found.get(r.id);
    positions.set(r.id, point ? { kind: "point", lat: point.lat, lng: point.lng } : { kind: "none" });
  }
  return positions;
}
