import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ValidationRecord, ValidationSummary } from "@/types";

interface RawReviewedReport {
  id: string;
  category: string;
  priority_name: "Low" | "Medium" | "High" | "Critical" | null;
  status: string;
  entry_tier: "emergency" | "other_reports";
  identity_withheld: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  created_at: string;
}

export interface ValidationHistoryData {
  summary: ValidationSummary;
  records: ValidationRecord[];
}

const HISTORY_LIMIT = 50;

/**
 * Fetches this barangay's reviewed reports (status validated/rejected) —
 * built on top of the review_report() cutover (reviewed_by/reviewed_at/
 * review_reason), so no audit_logs involvement is needed at all: barangay
 * roles can already SELECT incident_reports table-wide for their own
 * barangay, unlike audit_logs, which no barangay role can read.
 *
 * reviewed_by references auth.users(id), NOT profiles(id) directly — there's
 * no direct FK from incident_reports to profiles, so PostgREST's automatic
 * embed syntax (`profiles!reviewed_by(full_name)`) doesn't apply here. A
 * second query resolves reviewer names instead.
 *
 * Capped at HISTORY_LIMIT rows, so `summary` describes what's on screen —
 * not an all-time barangay total. The page copy says so explicitly.
 */
export async function getValidationHistory(barangayId: string): Promise<ValidationHistoryData> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("incident_reports")
    .select(
      "id, category, priority_name, status, entry_tier, identity_withheld, reviewed_by, reviewed_at, review_reason, created_at"
    )
    .eq("incident_barangay_id", barangayId)
    .in("status", ["validated", "rejected"])
    // nullsFirst: false matters — Postgres sorts NULLs FIRST on DESC by
    // default, which would float any pre-cutover row (reviewed_at IS NULL,
    // reviewed before review_report() existed) to the top of a
    // newest-first list.
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return emptyValidationHistoryData();

  const rows = data as RawReviewedReport[];

  const reviewerIds = [
    ...new Set(rows.map((r) => r.reviewed_by).filter((id): id is string => Boolean(id))),
  ];

  const reviewerNames = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", reviewerIds);
    if (reviewers) {
      for (const r of reviewers) {
        reviewerNames.set(r.id, r.full_name ?? "Unnamed official");
      }
    }
  }

  const records = rows.map((r) => toValidationRecord(r, reviewerNames));

  const summary: ValidationSummary = {
    total: rows.length,
    confirmed: rows.filter((r) => r.status === "validated").length,
    // "confirmedFalse" mapped to rejected count — the schema doesn't
    // distinguish WHY a report was rejected (duplicate vs. inaccurate vs.
    // malicious) the way the original mockup's naming implied; rejected is
    // the closest real equivalent.
    confirmedFalse: rows.filter((r) => r.status === "rejected").length,
    identityWithheld: rows.filter((r) => r.identity_withheld).length,
  };

  return { summary, records };
}

function toValidationRecord(
  r: RawReviewedReport,
  reviewerNames: Map<string, string>
): ValidationRecord {
  return {
    reportId: r.id,
    category: r.category,
    // No real "Log" tier column — approximated from entry_tier: standard
    // reports (not Emergency) map to Log, Emergency reports split
    // Critical/Standard by priority_name.
    tier:
      r.entry_tier === "other_reports"
        ? "Log"
        : r.priority_name === "Critical"
          ? "Critical"
          : "Standard",
    verdict: r.status === "validated" ? "Confirmed" : "Rejected",
    // Pre-cutover rows can have a NULL reviewed_by (nobody stamped them),
    // and a reviewer whose profiles row isn't readable falls through the
    // same way — both surface as "Unknown official" rather than a blank cell.
    validatingOfficial: r.reviewed_by
      ? reviewerNames.get(r.reviewed_by) ?? "Unnamed official"
      : "Unknown official",
    timestamp: formatReviewedAt(r.reviewed_at ?? r.created_at),
    reporter: {
      // Privacy-by-design: officials never see a reporter's name, withheld
      // or not. Same rule as the queue.
      name: r.identity_withheld ? "Identity withheld" : "Verified reporter",
      identityWithheld: r.identity_withheld,
    },
    // Only present for rejected rows — review_reason is NULL for validated
    // ones (the RPC only fills it on rejection).
    reason: r.review_reason ?? undefined,
  };
}

function emptyValidationHistoryData(): ValidationHistoryData {
  return {
    summary: { total: 0, confirmed: 0, confirmedFalse: 0, identityWithheld: 0 },
    records: [],
  };
}

function formatReviewedAt(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
