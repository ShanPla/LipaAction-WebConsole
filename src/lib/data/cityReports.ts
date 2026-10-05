import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, isUuid, startOfManilaDay } from "@/lib/utils";
import { BARANGAY_RESOLVE_LIVE } from "@/lib/features";
import type { AgencyRouting, ReportPriority } from "@/types";

// Which reports a status filter keeps. Kept in step with PENDING_STATUSES in
// queue.ts and the CONFIRMED set in dailyQueueSummary.ts. Not exported as a
// value: this module is server-only, so the page's filter lists the keys
// itself, checked against CityStatusFilter.
const CITY_STATUS_FILTERS = {
  all: [],
  awaiting: ["pending_priority", "prioritized"],
  validated: ["validated"],
  withAgencies: ["routed", "resolved"],
  rejected: ["rejected"],
} as const;

export type CityStatusFilter = keyof typeof CITY_STATUS_FILTERS;

export interface CityReport {
  id: string;
  barangayId: string | null;
  // null when the name couldn't be read; the page says so.
  barangayName: string | null;
  category: string; // display label
  subCategory: string | null; // display label; Other-reports only
  priority: ReportPriority;
  priorityScore: number | null;
  confidenceBand: string | null;
  status: string;
  entryTier: "emergency" | "other_reports";
  identityWithheld: boolean;
  discreetReporting: boolean;
  // The resident's own words and answers, verbatim. Shown only in the
  // drawer, whose opening is logged, never in the list.
  description: string | null;
  severitySelfRating: string | null;
  anyoneHurt: string | null;
  isOngoing: boolean | null;
  safetyNetConfirmation: string | null;
  hasPhoto: boolean;
  hasVideo: boolean;
  submittedAt: string;
  reviewedAt: string | null;
  // Primary agency first. null when agency_routing couldn't be read, which
  // is not the same as [not routed].
  routing: AgencyRouting[] | null;
  // Closed by the barangay desk itself, with no agency. Such a report is
  // resolved with no agency rows, which must not read as [not routed].
  resolvedAtBarangay: boolean;
}

export interface CityReportsData {
  reports: CityReport[];
  // Every barangay, for the filter. Empty when the list couldn't be read.
  barangays: { id: string; name: string }[];
  barangay: string | null; // the filter applied, a barangay id
  status: CityStatusFilter;
  // A report to open on arrival (?open=<id>, from the city map). A proven
  // uuid or null; the page opens it only if it is in the list.
  open: string | null;
  windowDays: number;
  limit: number;
  capped: boolean;
  loadFailed: boolean;
}

// Deliberately no user_id, reviewed_by or geom: this role can read all three
// city-wide, and the first two lead to a person. Nothing below may add them.
const REPORT_COLUMNS =
  "id, incident_barangay_id, category, description, priority_name, priority_score, confidence_band, status, entry_tier, identity_withheld, discreet_reporting, severity_self_rating, anyone_hurt, is_ongoing, safety_net_confirmation, has_photo, has_video, created_at, reviewed_at, sub_category";

// barangay_resolved_at arrives with the resolve-at-barangay migration;
// naming it before then would fail the list.
// Typed as a plain string: the list is built at run time, and the client's
// select parser only reads a literal. The rows are shaped by hand below
// either way.
const reportColumns: string = BARANGAY_RESOLVE_LIVE
  ? `${REPORT_COLUMNS}, barangay_resolved_at`
  : REPORT_COLUMNS;

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIST_LIMIT = 200;
// Ids per agency_routing request. The ids travel in the URL, and 200 uuids
// in one would pass 7 kB.
const ID_CHUNK = 100;

interface RawReport {
  id: string;
  incident_barangay_id: string | null;
  category: string;
  description: string | null;
  priority_name: ReportPriority;
  priority_score: number | null;
  confidence_band: string | null;
  status: string;
  entry_tier: "emergency" | "other_reports";
  identity_withheld: boolean | null;
  discreet_reporting: boolean | null;
  severity_self_rating: string | null;
  anyone_hurt: string | null;
  is_ongoing: boolean | null;
  safety_net_confirmation: string | null;
  has_photo: boolean | null;
  has_video: boolean | null;
  created_at: string;
  reviewed_at: string | null;
  sub_category: string | null;
  // Only selected once the backend's migration is live (see the query).
  barangay_resolved_at?: string | null;
}

interface RawRouting {
  incident_report_id: string;
  agency_id: string;
  is_primary: boolean;
  auto_routed: boolean | null;
  routed_at: string | null;
  acknowledged_at: string | null;
  in_progress_at: string | null;
  resolved_at: string | null;
  resolution_outcome: AgencyRouting["resolutionOutcome"];
}

/**
 * The city-wide report list: every report filed in the last 30 Manila days,
 * newest first, optionally narrowed to one barangay or one stage. Read-only.
 *
 * The filters arrive from the URL, so they are proven here: a barangay must
 * be a uuid, and a stage one of CITY_STATUS_FILTERS. Anything else is
 * ignored rather than passed to the query.
 */
export async function getCityReports(
  requestedBarangay: string | undefined,
  requestedStatus: string | undefined,
  requestedOpen?: string
): Promise<CityReportsData> {
  const barangay = isUuid(requestedBarangay) ? requestedBarangay : null;
  const open = isUuid(requestedOpen) ? requestedOpen : null;
  const status: CityStatusFilter =
    // An own key, not `in`: [toString] is `in` every object.
    requestedStatus && Object.prototype.hasOwnProperty.call(CITY_STATUS_FILTERS, requestedStatus)
      ? (requestedStatus as CityStatusFilter)
      : "all";
  const since = new Date(startOfManilaDay().getTime() - (WINDOW_DAYS - 1) * DAY_MS).toISOString();

  const supabase = createClient();
  let query = supabase
    .from("incident_reports")
    .select(reportColumns)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (barangay) query = query.eq("incident_barangay_id", barangay);
  const statuses = CITY_STATUS_FILTERS[status] as readonly string[];
  if (statuses.length > 0) query = query.in("status", [...statuses]);

  const [reportsRes, barangaysRes] = await Promise.all([
    query,
    supabase.from("barangays").select("id, name").order("name", { ascending: true }).limit(500),
  ]);

  if (barangaysRes.error) {
    console.error("[city-reports] barangays load failed", barangaysRes.error.code, barangaysRes.error.message);
  }
  const barangays = ((barangaysRes.data ?? []) as { id: string; name: string | null }[])
    .filter((b) => b.name && b.name.trim())
    .map((b) => ({ id: b.id, name: (b.name as string).trim() }));

  const base = { barangays, barangay, status, open, windowDays: WINDOW_DAYS, limit: LIST_LIMIT };

  if (reportsRes.error || !reportsRes.data) {
    console.error("[city-reports] load failed", reportsRes.error?.code, reportsRes.error?.message);
    return { ...base, reports: [], capped: false, loadFailed: true };
  }

  const raw = reportsRes.data as unknown as RawReport[];
  const routing = await loadRouting(raw.map((r) => r.id));
  const names = new Map(barangays.map((b) => [b.id, b.name]));

  const reports = raw.map(
    (r): CityReport => ({
      id: r.id,
      barangayId: r.incident_barangay_id,
      barangayName: r.incident_barangay_id ? names.get(r.incident_barangay_id) ?? null : null,
      category: categoryLabel(r.category),
      subCategory: r.sub_category ? categoryLabel(r.sub_category) : null,
      priority: r.priority_name,
      priorityScore: r.priority_score,
      confidenceBand: r.confidence_band,
      status: r.status,
      entryTier: r.entry_tier,
      identityWithheld: Boolean(r.identity_withheld),
      discreetReporting: Boolean(r.discreet_reporting),
      description: r.description,
      severitySelfRating: r.severity_self_rating,
      anyoneHurt: r.anyone_hurt,
      isOngoing: r.is_ongoing,
      safetyNetConfirmation: r.safety_net_confirmation,
      hasPhoto: Boolean(r.has_photo),
      hasVideo: Boolean(r.has_video),
      submittedAt: r.created_at,
      reviewedAt: r.reviewed_at,
      routing: routing === null ? null : routing.get(r.id) ?? [],
      resolvedAtBarangay: Boolean(r.barangay_resolved_at),
    })
  );

  return { ...base, reports, capped: raw.length === LIST_LIMIT, loadFailed: false };
}

/**
 * The agency rows behind the listed reports. A failure costs only the agency
 * section of each drawer (null, shown as [couldn't load]), never the list.
 */
async function loadRouting(reportIds: string[]): Promise<Map<string, AgencyRouting[]> | null> {
  if (reportIds.length === 0) return new Map();
  const supabase = createClient();
  const chunks: string[][] = [];
  for (let i = 0; i < reportIds.length; i += ID_CHUNK) chunks.push(reportIds.slice(i, i + ID_CHUNK));
  const [agenciesRes, ...routingResults] = await Promise.all([
    supabase.from("agencies").select("id, name").limit(500),
    ...chunks.map((ids) =>
      supabase
        .from("agency_routing")
        .select("incident_report_id, agency_id, is_primary, auto_routed, routed_at, acknowledged_at, in_progress_at, resolved_at, resolution_outcome")
        .in("incident_report_id", ids)
    ),
  ]);

  const failed = routingResults.find((r) => r.error || !r.data);
  if (failed) {
    console.error("[city-reports] agency_routing load failed", failed.error?.code, failed.error?.message);
    return null;
  }
  const rows = routingResults.flatMap((r) => (r.data ?? []) as RawRouting[]);
  if (agenciesRes.error) {
    console.error("[city-reports] agencies load failed", agenciesRes.error.code, agenciesRes.error.message);
  }

  const agencyNames = new Map<string, string>(
    ((agenciesRes.data ?? []) as { id: string; name: string | null }[]).map((a) => [
      a.id,
      a.name?.trim() || "Unnamed agency",
    ])
  );

  const byReport = new Map<string, AgencyRouting[]>();
  for (const row of rows) {
    const list = byReport.get(row.incident_report_id) ?? [];
    list.push({
      agencyName: agencyNames.get(row.agency_id) ?? "Unnamed agency",
      isPrimary: row.is_primary,
      autoRouted: Boolean(row.auto_routed),
      routedAt: row.routed_at,
      acknowledgedAt: row.acknowledged_at,
      inProgressAt: row.in_progress_at,
      resolvedAt: row.resolved_at,
      resolutionOutcome: row.resolution_outcome,
    });
    byReport.set(row.incident_report_id, list);
  }
  // Primary agency first, as on the queue.
  for (const list of byReport.values()) list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return byReport;
}
