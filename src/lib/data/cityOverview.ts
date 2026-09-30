import "server-only";
import { createClient } from "@/lib/supabase/server";
import { manilaTimestamp, startOfManilaDay } from "@/lib/utils";

export interface BarangayActivity {
  // null for a report with no incident barangay set.
  barangayId: string | null;
  // null when the barangay's name couldn't be read; the page says so.
  name: string | null;
  today: number;
  week: number;
  // One count per day in CityOverviewData.days, oldest first.
  daily: number[];
  // Awaiting review now, whatever day it was filed.
  awaitingReview: number;
  // Of the last 7 days' reports, by where each stands now.
  validated: number;
  rejected: number;
}

export interface CityOverviewTotals {
  today: number;
  // Reports per day over the last 7 days, today included.
  dailyAverage: number;
  awaitingReview: number;
  criticalAwaiting: number;
  // Emergencies still awaiting review more than SLA_MINUTES after filing.
  emergenciesPastSla: number;
}

export interface CityOverviewData {
  days: string[]; // YYYY-MM-DD in Manila, oldest first, today last
  asOf: string; // ISO instant the counts were taken
  totals: CityOverviewTotals;
  barangays: BarangayActivity[];
  // Travel with the data because the client can't import a value from this
  // server-only module.
  limit: number;
  slaMinutes: number;
  capped: boolean;
  // True when a query failed and the zeros are a fallback. The page shows
  // the outage banner instead of claiming a quiet city.
  loadFailed: boolean;
}

// Kept in step with PENDING_STATUSES in queue.ts and clusters.ts.
const PENDING_STATUSES = ["pending_priority", "prioritized"];
const CONFIRMED = new Set(["validated", "routed", "resolved"]);

const WEEK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// The paper's Tier 0 acknowledgement target (p.102), the same five minutes
// the queue's SLA alert uses.
const SLA_MINUTES = 5;
// Far above the pilot's city-wide volume for a week. Reaching it is
// reported on the page, not hidden.
const ROW_LIMIT = 5000;

interface WeekRow {
  incident_barangay_id: string | null;
  status: string;
  created_at: string;
}

interface PendingRow {
  incident_barangay_id: string | null;
  priority_name: string | null;
  entry_tier: string;
  created_at: string;
}

/**
 * The city dashboard's overview: every barangay's reports over the last 7
 * Manila days, plus what is awaiting review across the city right now.
 *
 * municipal_admin can read every column city-wide, reporter identity
 * included, so what keeps this page free of personal data is only the
 * select lists below: barangay, status, priority, tier and time. Never add
 * user_id or anything that leads to a person. Counts carry no personal data,
 * so viewing them writes no access-log entry.
 */
export async function getCityOverview(): Promise<CityOverviewData> {
  const now = Date.now();
  const todayStart = startOfManilaDay(now).getTime();
  const weekStart = todayStart - (WEEK_DAYS - 1) * DAY_MS;
  const days = Array.from({ length: WEEK_DAYS }, (_, i) =>
    manilaTimestamp(new Date(weekStart + i * DAY_MS + 12 * 60 * 60 * 1000).toISOString()).slice(0, 10)
  );

  const supabase = createClient();
  const [week, pending] = await Promise.all([
    supabase
      .from("incident_reports")
      .select("incident_barangay_id, status, created_at")
      .gte("created_at", new Date(weekStart).toISOString())
      .limit(ROW_LIMIT),
    // Not limited to the week: a report filed nine days ago and still
    // undecided is the one oversight most needs to see.
    supabase
      .from("incident_reports")
      .select("incident_barangay_id, priority_name, entry_tier, created_at")
      .in("status", PENDING_STATUSES)
      .limit(ROW_LIMIT),
  ]);

  if (week.error || pending.error || !week.data || !pending.data) {
    console.error(
      "[city-overview] load failed",
      week.error?.code ?? pending.error?.code,
      week.error?.message ?? pending.error?.message
    );
    return {
      days,
      asOf: new Date(now).toISOString(),
      totals: { today: 0, dailyAverage: 0, awaitingReview: 0, criticalAwaiting: 0, emergenciesPastSla: 0 },
      barangays: [],
      limit: ROW_LIMIT,
      slaMinutes: SLA_MINUTES,
      capped: false,
      loadFailed: true,
    };
  }

  const weekRows = week.data as WeekRow[];
  const pendingRows = pending.data as PendingRow[];
  const byBarangay = new Map<string | null, BarangayActivity>();
  const entry = (id: string | null) => {
    let a = byBarangay.get(id);
    if (!a) {
      a = { barangayId: id, name: null, today: 0, week: 0, daily: Array(WEEK_DAYS).fill(0), awaitingReview: 0, validated: 0, rejected: 0 };
      byBarangay.set(id, a);
    }
    return a;
  };

  let today = 0;
  for (const r of weekRows) {
    const a = entry(r.incident_barangay_id);
    const day = Math.floor((Date.parse(r.created_at) - weekStart) / DAY_MS);
    if (day < 0 || day >= WEEK_DAYS) continue;
    a.week += 1;
    a.daily[day] += 1;
    if (day === WEEK_DAYS - 1) {
      a.today += 1;
      today += 1;
    }
    if (CONFIRMED.has(r.status)) a.validated += 1;
    else if (r.status === "rejected") a.rejected += 1;
  }

  let criticalAwaiting = 0;
  let emergenciesPastSla = 0;
  const slaCutoff = now - SLA_MINUTES * 60 * 1000;
  for (const r of pendingRows) {
    entry(r.incident_barangay_id).awaitingReview += 1;
    if (r.priority_name === "Critical") criticalAwaiting += 1;
    if (r.entry_tier === "emergency" && Date.parse(r.created_at) < slaCutoff) emergenciesPastSla += 1;
  }

  // Names are a second query, and its failure costs only the names: the
  // counts are still right, and the page labels the row as unnamed.
  const ids = [...byBarangay.keys()].filter((id): id is string => id !== null);
  if (ids.length > 0) {
    const { data: names, error } = await supabase.from("barangays").select("id, name").in("id", ids);
    if (error) console.error("[city-overview] barangay names failed", error.code, error.message);
    for (const b of (names ?? []) as { id: string; name: string | null }[]) {
      const a = byBarangay.get(b.id);
      if (a) a.name = b.name;
    }
  }

  const barangays = [...byBarangay.values()].sort(
    (a, b) =>
      b.awaitingReview - a.awaitingReview ||
      b.week - a.week ||
      (a.name ?? "￿").localeCompare(b.name ?? "￿")
  );

  return {
    days,
    asOf: new Date(now).toISOString(),
    totals: {
      today,
      dailyAverage: Math.round((weekRows.length / WEEK_DAYS) * 10) / 10,
      awaitingReview: pendingRows.length,
      criticalAwaiting,
      emergenciesPastSla,
    },
    barangays,
    limit: ROW_LIMIT,
    slaMinutes: SLA_MINUTES,
    capped: weekRows.length === ROW_LIMIT || pendingRows.length === ROW_LIMIT,
    loadFailed: false,
  };
}
