import "server-only";
import { parsePoint } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, startOfManilaDay } from "@/lib/utils";
import type { ReportPriority } from "@/types";

// Still open: awaiting review, validated and waiting to be routed, or with
// agencies. Resolved and rejected reports need no one's attention, so they
// stay off the map.
const OPEN_STATUSES = ["pending_priority", "prioritized", "validated", "routed"];

const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// Per query. The reports that may be placed and the ones that may not are
// read separately, so the page can hold up to twice this.
const LIMIT = 500;

export interface MapPoint {
  id: string;
  category: string; // display label
  priority: ReportPriority;
  priorityScore: number | null;
  status: string;
  submittedAt: string;
  barangayName: string | null;
  lat: number;
  lng: number;
}

export interface MapBarangayCount {
  barangayId: string | null;
  name: string | null;
  mapped: number;
  withheld: number;
  discreet: number;
  unlocated: number;
}

export interface CityMapData {
  points: MapPoint[];
  barangays: MapBarangayCount[];
  totals: { open: number; mapped: number; withheld: number; discreet: number; unlocated: number };
  windowDays: number;
  limit: number;
  capped: boolean;
  loadFailed: boolean;
  asOf: string;
}

interface RawLocated {
  id: string;
  incident_barangay_id: string | null;
  category: string;
  priority_name: ReportPriority;
  priority_score: number | null;
  status: string;
  created_at: string;
  geom: unknown;
}

interface RawKeptOff {
  incident_barangay_id: string | null;
  identity_withheld: boolean | null;
  discreet_reporting: boolean | null;
}

/**
 * Open reports from the last week, for the city map.
 *
 * Two kinds of report are never placed on the map, only counted under their
 * barangay, and are read in a query of their own that never selects geom:
 * - identity withheld (the backend owner's condition, 2026-10-01). The
 *   database doesn't stop such a report carrying the phone's position. A
 *   missing identity_withheld counts as withheld: when in doubt, no dot.
 * - discreet (the console's own rule, the same day). The resident asked not
 *   to be contacted, as in a domestic-violence report, and a dot there is
 *   likely their home, on a screen others can see. A missing flag is read
 *   as not discreet, as everywhere else in the console.
 *
 * Nothing here selects user_id or reviewed_by: this role can read both
 * city-wide, and both lead to a person.
 */
export async function getCityMap(): Promise<CityMapData> {
  const since = new Date(startOfManilaDay().getTime() - (WINDOW_DAYS - 1) * DAY_MS).toISOString();
  const supabase = createClient();

  const [locatedRes, keptOffRes, barangaysRes] = await Promise.all([
    supabase
      .from("incident_reports")
      .select("id, incident_barangay_id, category, priority_name, priority_score, status, created_at, geom")
      .eq("identity_withheld", false)
      .not("discreet_reporting", "is", true)
      .in("status", OPEN_STATUSES)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("incident_reports")
      .select("incident_barangay_id, identity_withheld, discreet_reporting")
      .or("identity_withheld.is.null,identity_withheld.eq.true,discreet_reporting.is.true")
      .in("status", OPEN_STATUSES)
      .gte("created_at", since)
      .limit(LIMIT),
    supabase.from("barangays").select("id, name").order("name", { ascending: true }).limit(500),
  ]);

  const asOf = new Date().toISOString();
  const base = { windowDays: WINDOW_DAYS, limit: LIMIT, asOf };

  if (barangaysRes.error) {
    console.error("[city-map] barangays load failed", barangaysRes.error.code, barangaysRes.error.message);
  }
  const names = new Map(
    ((barangaysRes.data ?? []) as { id: string; name: string | null }[])
      .filter((b) => b.name && b.name.trim())
      .map((b) => [b.id, (b.name as string).trim()])
  );

  // Either report query failing fails the page: a map missing every report
  // kept off it, or every one placed on it, would understate what is open.
  if (locatedRes.error || !locatedRes.data || keptOffRes.error || !keptOffRes.data) {
    const error = locatedRes.error ?? keptOffRes.error;
    console.error("[city-map] load failed", error?.code, error?.message);
    return {
      ...base,
      points: [],
      barangays: [],
      totals: { open: 0, mapped: 0, withheld: 0, discreet: 0, unlocated: 0 },
      capped: false,
      loadFailed: true,
    };
  }

  const located = locatedRes.data as RawLocated[];
  const keptOff = keptOffRes.data as RawKeptOff[];

  const counts = new Map<string | null, MapBarangayCount>();
  const countFor = (barangayId: string | null) => {
    let c = counts.get(barangayId);
    if (!c) {
      c = { barangayId, name: barangayId ? names.get(barangayId) ?? null : null, mapped: 0, withheld: 0, discreet: 0, unlocated: 0 };
      counts.set(barangayId, c);
    }
    return c;
  };

  const points: MapPoint[] = [];
  for (const r of located) {
    const at = parsePoint(r.geom);
    if (!at) {
      countFor(r.incident_barangay_id).unlocated += 1;
      continue;
    }
    countFor(r.incident_barangay_id).mapped += 1;
    points.push({
      id: r.id,
      category: categoryLabel(r.category),
      priority: r.priority_name,
      priorityScore: r.priority_score,
      status: r.status,
      submittedAt: r.created_at,
      barangayName: r.incident_barangay_id ? names.get(r.incident_barangay_id) ?? null : null,
      lat: at.lat,
      lng: at.lng,
    });
  }
  // A report both withheld and discreet is counted once, as withheld.
  let withheld = 0;
  for (const r of keptOff) {
    if (r.identity_withheld !== false) {
      countFor(r.incident_barangay_id).withheld += 1;
      withheld += 1;
    } else {
      countFor(r.incident_barangay_id).discreet += 1;
    }
  }

  // Named barangays by name, then any without a name, then reports with no
  // barangay at all.
  const barangays = [...counts.values()].sort((a, b) => {
    if ((a.barangayId === null) !== (b.barangayId === null)) return a.barangayId === null ? 1 : -1;
    if ((a.name === null) !== (b.name === null)) return a.name === null ? 1 : -1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const mapped = points.length;
  const unlocated = located.length - mapped;
  return {
    ...base,
    points,
    barangays,
    totals: { open: located.length + keptOff.length, mapped, withheld, discreet: keptOff.length - withheld, unlocated },
    capped: located.length === LIMIT || keptOff.length === LIMIT,
    loadFailed: false,
  };
}

// The point reader lives in src/lib/geo.ts, shared with the queue's location
// preview; re-exported so this module's callers keep one import.
export { parsePoint };
