import "server-only";
import { createClient } from "@/lib/supabase/server";
import { startOfManilaDay } from "@/lib/utils";
import type {
  AgencyRouting,
  KpiSummary,
  QueueReport,
  QueueTabId,
  RoutingPlanEntry,
  SituationCluster,
} from "@/types";

// Statuses that still belong in an active working queue. Anything past this
// (validated/routed/resolved/rejected) has already been acted on.
const PENDING_STATUSES = ["pending_priority", "prioritized"];

// Past validation, handed to agencies. Nothing moves a report here on its
// own — routing is a manual barangay action (see routeReport).
const DOWNSTREAM_STATUSES = ["routed", "resolved"];

// Every status a positively reviewed report can be in. A report validated
// this morning and routed this afternoon still counts toward [Validated
// today]; counting only status = 'validated' would make routing a report
// subtract it from the tile.
const VALIDATED_OR_LATER = ["validated", ...DOWNSTREAM_STATUSES];

// The routed half of the Recent validated tab is a glance at what just
// happened, not a history; Validation History is the full record. The
// awaiting-routing half is NOT capped — it is a to-do list, and a validated
// report that fell off the end of a capped list would be a dead end nobody
// could see.
const RECENT_ROUTED_LIMIT = 20;

const REPORT_COLUMNS =
  "id, category, description, priority_name, status, entry_tier, identity_withheld, created_at, cluster_id, reviewed_at, severity_self_rating, safety_net_confirmation, anyone_hurt, is_ongoing, has_photo, has_video, discreet_reporting, priority_class, priority_score, confidence_band";

interface RawReport {
  id: string;
  category: string;
  description: string | null;
  priority_name: "Low" | "Medium" | "High" | "Critical" | null;
  status: string;
  entry_tier: "emergency" | "other_reports";
  identity_withheld: boolean;
  created_at: string;
  cluster_id: string | null;
  reviewed_at: string | null;
  // Detail-drawer fields. Fetched with the list rather than on demand: the
  // whole set is one row that RLS already allows, so a second per-report
  // round trip would buy nothing.
  severity_self_rating: string | null;
  safety_net_confirmation: string | null;
  anyone_hurt: string | null;
  is_ongoing: boolean | null;
  has_photo: boolean;
  has_video: boolean;
  discreet_reporting: boolean;
  priority_class: number | null;
  priority_score: number | null;
  confidence_band: string | null;
}

interface RawRouting {
  incident_report_id: string;
  agency_id: string;
  is_primary: boolean;
  routed_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_outcome: AgencyRouting["resolutionOutcome"];
}

interface RawMapping {
  category_key: string;
  agency_id: string;
  is_primary: boolean;
  sort_order: number | null;
}

// What toQueueReport needs beyond the report row itself. Pending reports get
// the empty default: routing doesn't apply to them yet.
interface RoutingExtras {
  routing: AgencyRouting[];
  routingPlan: RoutingPlanEntry[] | null;
}

const NO_ROUTING: RoutingExtras = { routing: [], routingPlan: null };

export interface QueueData {
  kpiSummary: KpiSummary;
  activeCluster: SituationCluster | null;
  queueByTab: Record<QueueTabId, QueueReport[]>;
  queueTabMeta: { id: QueueTabId; label: string; count: number }[];
  // True when the queries failed and the empty shape above is a fallback,
  // not the truth. The page must say so — an outage rendered as [No reports
  // in this queue right now] is the one message an emergency console must
  // never show by accident.
  loadFailed: boolean;
}

/**
 * Fetches and shapes this barangay's incident_reports into everything the
 * Queue page needs: the 4 tabs (Emergency/Standard/Duplicates/Validated —
 * "Recall window" was dropped, no backend concept for it), KPI counts, and
 * an "active cluster" banner when duplicate reports are grouped together.
 *
 * RLS already scopes incident_reports to the signed-in official's barangay —
 * the .eq() below is belt-and-suspenders, not the actual security boundary.
 */
export async function getBarangayQueue(
  barangayId: string,
  barangayName: string
): Promise<QueueData> {
  const supabase = createClient();

  // Narrow queries rather than one wide one. This used to select every
  // report the barangay had ever filed and partition by status in JS — fine
  // at one report, thousands of rows per page load after a year in service.
  // Pending and awaiting-routing are to-do lists and stay uncapped (their
  // size is the backlog itself); recently routed is capped in SQL; today's
  // count is a HEAD request that returns no rows at all.
  const dayStart = startOfManilaDay().toISOString();
  const [pendingRes, awaitingRes, routedRes, todayRes] = await Promise.all([
    supabase
      .from("incident_reports")
      .select(REPORT_COLUMNS)
      .eq("incident_barangay_id", barangayId)
      .in("status", PENDING_STATUSES)
      .order("created_at", { ascending: false }),
    supabase
      .from("incident_reports")
      .select(REPORT_COLUMNS)
      .eq("incident_barangay_id", barangayId)
      .eq("status", "validated")
      // nullsFirst: false — pre-cutover rows have no reviewed_at and would
      // otherwise float to the top of a newest-first list.
      .order("reviewed_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("incident_reports")
      .select(REPORT_COLUMNS)
      .eq("incident_barangay_id", barangayId)
      .in("status", DOWNSTREAM_STATUSES)
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(RECENT_ROUTED_LIMIT),
    // Pre-cutover rows (reviewed_at IS NULL) fall out of a >= comparison on
    // their own, which is the intended exclusion: there's no knowing what
    // day they were handled.
    supabase
      .from("incident_reports")
      .select("id", { count: "exact", head: true })
      .eq("incident_barangay_id", barangayId)
      .in("status", VALIDATED_OR_LATER)
      .gte("reviewed_at", dayStart),
  ]);

  const failure = pendingRes.error ?? awaitingRes.error ?? routedRes.error ?? todayRes.error;
  if (failure || !pendingRes.data || !awaitingRes.data || !routedRes.data) {
    // Fail closed to an empty queue rather than crashing the whole page on a
    // transient query error — but say so in the returned data, and put the
    // real reason in the server log, where table and column names belong.
    console.error("[queue] load failed", failure?.code, failure?.message);
    return failedQueueData();
  }

  const pending = pendingRes.data as RawReport[];
  const awaiting = awaitingRes.data as RawReport[];
  const routed = routedRes.data as RawReport[];

  const routingExtras = await loadRouting(supabase, awaiting, routed);

  const emergency = pending
    .filter((r) => r.entry_tier === "emergency")
    .map((r) => toQueueReport(r));
  const standard = pending
    .filter((r) => r.entry_tier === "other_reports")
    .map((r) => toQueueReport(r));
  // Awaiting routing first: those still need someone to act. Routed ones
  // are there to show what the agencies have done since.
  const validated = [...awaiting, ...routed].map((r) =>
    toQueueReport(r, routingExtras.get(r.id))
  );

  // Duplicates: pending reports that share a cluster_id with at least one
  // other pending report (the duplicate-flagging algorithm's output).
  const clusterGroups = new Map<string, RawReport[]>();
  for (const r of pending) {
    if (!r.cluster_id) continue;
    const group = clusterGroups.get(r.cluster_id) ?? [];
    group.push(r);
    clusterGroups.set(r.cluster_id, group);
  }
  const duplicateGroups = [...clusterGroups.values()].filter((g) => g.length >= 2);
  const duplicates = duplicateGroups.flat().map((r) => toQueueReport(r));

  // Active-cluster banner (the "ACTIVE FLOODING"-style card): the single
  // largest duplicate group, if any exist.
  const largestGroup = [...duplicateGroups].sort((a, b) => b.length - a.length)[0] ?? null;
  const activeCluster: SituationCluster | null = largestGroup
    ? {
        id: largestGroup[0].cluster_id as string,
        label: largestGroup[0].category.toUpperCase(),
        category: largestGroup[0].category,
        memberCount: largestGroup.length,
        // RLS only lets this official see their own barangay's reports, so a
        // cross-barangay cluster (if one exists) would only ever show this
        // one barangay's members from here.
        barangaysAffected: [barangayName],
        identityWithheldMembers: largestGroup.filter((r) => r.identity_withheld).length,
        members: largestGroup.map((r) => toQueueReport(r)),
      }
    : null;

  const kpiSummary: KpiSummary = {
    fastTriageCount: emergency.length,
    standardIntakeCount: standard.length,
    // NOTE: repurposed from the mockup's "median resolution time" (no real
    // resolution-time column exists yet) to "median time pending reports
    // have been waiting" — same KPI tile, adjusted meaning. Revisit once
    // agency_routing's resolved_at is wired in for a true resolution-time
    // metric.
    medianMinutes: medianAgeMinutes(pending),
    // Today in Manila — see startOfManilaDay. Counted in SQL rather than from
    // the tab's rows, whose routed half is capped and would undercount a busy
    // day. Includes routed and resolved, so routing a report doesn't take it
    // back off the tile. This previously counted every validated report ever
    // while the tile was labelled [Validated today].
    validatedCount: todayRes.count ?? 0,
  };

  const queueByTab: Record<QueueTabId, QueueReport[]> = {
    emergency,
    standard,
    duplicates,
    validated,
  };

  const queueTabMeta: QueueData["queueTabMeta"] = [
    { id: "emergency", label: "Emergency Fast-triage", count: emergency.length },
    { id: "standard", label: "Standard intake", count: standard.length },
    { id: "duplicates", label: "Flagged duplicates", count: duplicates.length },
    { id: "validated", label: "Recent validated", count: validated.length },
  ];

  return { kpiSummary, activeCluster, queueByTab, queueTabMeta, loadFailed: false };
}

/**
 * Everything the Recent validated tab says about routing, loaded after the
 * reports themselves because it needs their ids and categories.
 *
 * None of this is allowed to take the queue down. These three tables are
 * secondary to the pending list — an RLS change on agency_routing must not
 * put an outage banner over live emergencies — so each failure is logged and
 * degrades only its own part:
 *  - routing rows fail → routed reports show their status without agency
 *    progress; a half-finished routing can't be detected, which is safe
 *    because routeReport is idempotent.
 *  - the category mapping fails → routingPlan stays null on validated
 *    reports, which the UI shows as [couldn't load routing options] rather
 *    than as [no agency mapped], a claim it couldn't back up.
 *  - agency names fail → [Unnamed agency].
 */
async function loadRouting(
  supabase: ReturnType<typeof createClient>,
  awaiting: RawReport[],
  routed: RawReport[]
): Promise<Map<string, RoutingExtras>> {
  const extras = new Map<string, RoutingExtras>();
  const reportIds = [...awaiting, ...routed].map((r) => r.id);
  if (reportIds.length === 0) return extras;

  const categories = [...new Set(awaiting.map((r) => r.category))];

  const [routingRes, mappingRes, agenciesRes] = await Promise.all([
    supabase
      .from("agency_routing")
      .select(
        "incident_report_id, agency_id, is_primary, routed_at, acknowledged_at, resolved_at, resolution_outcome"
      )
      .in("incident_report_id", reportIds),
    categories.length > 0
      ? supabase
          .from("category_agency_routing")
          .select("category_key, agency_id, is_primary, sort_order")
          .in("category_key", categories)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as RawMapping[], error: null }),
    // A small reference table (the city's responder agencies), readable by
    // every authenticated user — fetched whole rather than by id so it can
    // run in parallel with the two lookups that would supply the ids.
    supabase.from("agencies").select("id, name").limit(500),
  ]);

  if (routingRes.error) {
    console.error("[queue] agency_routing load failed", routingRes.error.code, routingRes.error.message);
  }
  if (mappingRes.error) {
    console.error(
      "[queue] category_agency_routing load failed",
      mappingRes.error.code,
      mappingRes.error.message
    );
  }
  if (agenciesRes.error) {
    console.error("[queue] agencies load failed", agenciesRes.error.code, agenciesRes.error.message);
  }

  const agencyNames = new Map<string, string>(
    ((agenciesRes.data ?? []) as { id: string; name: string | null }[]).map((a) => [
      a.id,
      a.name?.trim() || "Unnamed agency",
    ])
  );
  const nameOf = (agencyId: string) => agencyNames.get(agencyId) ?? "Unnamed agency";

  const routingByReport = new Map<string, AgencyRouting[]>();
  for (const row of (routingRes.data ?? []) as RawRouting[]) {
    const list = routingByReport.get(row.incident_report_id) ?? [];
    list.push({
      agencyName: nameOf(row.agency_id),
      isPrimary: row.is_primary,
      routedAt: row.routed_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      resolutionOutcome: row.resolution_outcome,
    });
    routingByReport.set(row.incident_report_id, list);
  }
  // Primary agency first, so every surface can read the head of the list as
  // the lead responder.
  for (const list of routingByReport.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }

  const planByCategory = new Map<string, RoutingPlanEntry[]>();
  if (!mappingRes.error) {
    for (const row of (mappingRes.data ?? []) as RawMapping[]) {
      const plan = planByCategory.get(row.category_key) ?? [];
      plan.push({ agencyName: nameOf(row.agency_id), isPrimary: row.is_primary });
      planByCategory.set(row.category_key, plan);
    }
  }

  for (const r of awaiting) {
    extras.set(r.id, {
      routing: routingByReport.get(r.id) ?? [],
      // A category absent from a successful lookup has no mapping: []. A
      // failed lookup proves nothing either way: null.
      routingPlan: mappingRes.error ? null : planByCategory.get(r.category) ?? [],
    });
  }
  for (const r of routed) {
    extras.set(r.id, { routing: routingByReport.get(r.id) ?? [], routingPlan: null });
  }

  return extras;
}

function toQueueReport(r: RawReport, extras: RoutingExtras = NO_ROUTING): QueueReport {
  return {
    id: r.id,
    category: r.category,
    priority: (r.priority_name ?? "Low") as QueueReport["priority"],
    summary: r.description ?? "(No description provided)",
    // No address text field exists on incident_reports (only geom) — location
    // is intentionally omitted here, not hidden. ReportRow only renders it
    // when present.
    timestamp: timeAgo(r.created_at),
    reporter: {
      // Real system never shows a reporter's name, identity-withheld or not
      // (privacy-by-design) — this matches that, not a data gap.
      name: r.identity_withheld ? "Identity withheld" : "Verified reporter",
      identityWithheld: r.identity_withheld,
    },
    details: {
      entryTier: r.entry_tier,
      status: r.status,
      description: r.description,
      severitySelfRating: r.severity_self_rating,
      safetyNetConfirmation: r.safety_net_confirmation,
      anyoneHurt: r.anyone_hurt,
      isOngoing: r.is_ongoing,
      hasPhoto: r.has_photo,
      hasVideo: r.has_video,
      discreetReporting: r.discreet_reporting,
      priorityClass: r.priority_class,
      priorityScore: r.priority_score,
      confidenceBand: r.confidence_band,
      clusterId: r.cluster_id,
      submittedAt: r.created_at,
      routing: extras.routing,
      routingPlan: extras.routingPlan,
    },
  };
}

function failedQueueData(): QueueData {
  return {
    kpiSummary: { fastTriageCount: 0, standardIntakeCount: 0, medianMinutes: 0, validatedCount: 0 },
    activeCluster: null,
    queueByTab: { emergency: [], standard: [], duplicates: [], validated: [] },
    queueTabMeta: [
      { id: "emergency", label: "Emergency Fast-triage", count: 0 },
      { id: "standard", label: "Standard intake", count: 0 },
      { id: "duplicates", label: "Flagged duplicates", count: 0 },
      { id: "validated", label: "Recent validated", count: 0 },
    ],
    loadFailed: true,
  };
}

function timeAgo(isoString: string): string {
  const diffMin = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function medianAgeMinutes(rows: RawReport[]): number {
  if (rows.length === 0) return 0;
  const ages = rows
    .map((r) => Math.floor((Date.now() - new Date(r.created_at).getTime()) / 60000))
    .sort((a, b) => a - b);
  const mid = Math.floor(ages.length / 2);
  return ages.length % 2 !== 0 ? ages[mid] : Math.round((ages[mid - 1] + ages[mid]) / 2);
}