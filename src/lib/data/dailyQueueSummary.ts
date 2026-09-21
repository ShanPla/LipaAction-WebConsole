import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, manilaTimestamp } from "@/lib/utils";

export interface DailyCounts {
  submitted: number;
  awaitingReview: number;
  // Validated, routed, or resolved — every report this barangay confirmed,
  // same reading as the queue's [Validated today] tile.
  validated: number;
  rejected: number;
}

export interface DailyCategoryRow extends DailyCounts {
  category: string; // display label
}

export interface DailyQueueSummaryData {
  date: string; // YYYY-MM-DD in Manila — the day shown
  today: string; // YYYY-MM-DD in Manila — the latest day that can be picked
  rows: DailyCategoryRow[];
  totals: DailyCounts;
  // Travels with the data for the same reason ValidationHistoryData.limit
  // does: the client can't import a value from this server-only module.
  limit: number;
  capped: boolean;
  // True when the query failed and the empty result is a fallback. The page
  // shows the outage banner instead of [no reports were submitted].
  loadFailed: boolean;
}

// Kept in step with PENDING_STATUSES in queue.ts and clusters.ts.
const AWAITING_REVIEW = new Set(["pending_priority", "prioritized"]);
const CONFIRMED = new Set(["validated", "routed", "resolved"]);

// Far above a barangay's daily volume. Reaching it is reported, not hidden.
const DAY_LIMIT = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The paper's Daily Queue Summary (#12, A.3.8): the day's submission activity
 * by category. Every report submitted on the chosen Manila day, grouped by
 * category and counted by where it stands now — so a report filed that day
 * and decided the next counts under its decision.
 *
 * Built only from columns the desk already reads (category, status,
 * created_at), under the same RLS as the queue. Nothing about reporters is
 * selected, and counts carry no personal information, so no access-log entry
 * is written for viewing it.
 *
 * The paper also offers a PNG export; this page exports CSV only (no image
 * library is bundled). Its other implemented report, the Weekly False-Report
 * Rate per Reporter (#14), needs reporter identity and sanction history that
 * this console never reads — the page says so rather than showing a stand-in.
 */
export async function getDailyQueueSummary(
  barangayId: string,
  requestedDate: string | undefined
): Promise<DailyQueueSummaryData> {
  const today = manilaDate(new Date());
  const date = resolveDate(requestedDate, today);
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start.getTime() + DAY_MS);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("incident_reports")
    .select("category, status")
    .eq("incident_barangay_id", barangayId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .limit(DAY_LIMIT);

  if (error || !data) {
    console.error("[daily-summary] load failed", error?.code, error?.message);
    return { date, today, rows: [], totals: noCounts(), limit: DAY_LIMIT, capped: false, loadFailed: true };
  }

  const byCategory = new Map<string, DailyCounts>();
  const totals = noCounts();
  for (const r of data as { category: string; status: string }[]) {
    const counts = byCategory.get(r.category) ?? noCounts();
    for (const c of [counts, totals]) {
      c.submitted += 1;
      if (AWAITING_REVIEW.has(r.status)) c.awaitingReview += 1;
      else if (CONFIRMED.has(r.status)) c.validated += 1;
      else if (r.status === "rejected") c.rejected += 1;
    }
    byCategory.set(r.category, counts);
  }

  const rows = [...byCategory]
    .map(([category, counts]) => ({ category: categoryLabel(category), ...counts }))
    .sort((a, b) => b.submitted - a.submitted || a.category.localeCompare(b.category));

  return { date, today, rows, totals, limit: DAY_LIMIT, capped: data.length === DAY_LIMIT, loadFailed: false };
}

function noCounts(): DailyCounts {
  return { submitted: 0, awaitingReview: 0, validated: 0, rejected: 0 };
}

// The Manila calendar date of an instant, as YYYY-MM-DD.
function manilaDate(instant: Date): string {
  return manilaTimestamp(instant.toISOString()).slice(0, 10);
}

/**
 * The day to show. Anything that isn't a real calendar date falls back to
 * today, and so does a future one. The round trip catches dates that don't
 * exist — some engines roll 2026-02-31 over to March instead of refusing it.
 */
function resolveDate(requested: string | undefined, today: string): string {
  if (!requested || !DATE_SHAPE.test(requested)) return today;
  const start = Date.parse(`${requested}T00:00:00+08:00`);
  if (Number.isNaN(start) || manilaDate(new Date(start)) !== requested) return today;
  return requested > today ? today : requested;
}
