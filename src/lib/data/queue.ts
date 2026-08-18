import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { KpiSummary, QueueReport, QueueTabId, SituationCluster } from "@/types";

// Statuses that still belong in an active working queue. Anything past this
// (validated/routed/resolved/rejected) has already been acted on.
const PENDING_STATUSES = ["pending_priority", "prioritized"];

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
}

export interface QueueData {
  kpiSummary: KpiSummary;
  activeCluster: SituationCluster | null;
  queueByTab: Record<QueueTabId, QueueReport[]>;
  queueTabMeta: { id: QueueTabId; label: string; count: number }[];
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

  const { data, error } = await supabase
    .from("incident_reports")
    .select(
      "id, category, description, priority_name, status, entry_tier, identity_withheld, created_at, cluster_id"
    )
    .eq("incident_barangay_id", barangayId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    // Fail closed to an empty queue rather than crashing the whole page on a
    // transient query error.
    return emptyQueueData();
  }

  const rows = data as RawReport[];
  const pending = rows.filter((r) => PENDING_STATUSES.includes(r.status));

  const emergency = pending.filter((r) => r.entry_tier === "emergency").map(toQueueReport);
  const standard = pending.filter((r) => r.entry_tier === "other_reports").map(toQueueReport);
  const validated = rows
    .filter((r) => r.status === "validated")
    .slice(0, 20)
    .map(toQueueReport);

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
  const duplicates = duplicateGroups.flat().map(toQueueReport);

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
        members: largestGroup.map(toQueueReport),
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
    validatedCount: rows.filter((r) => r.status === "validated").length,
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

  return { kpiSummary, activeCluster, queueByTab, queueTabMeta };
}

function toQueueReport(r: RawReport): QueueReport {
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
  };
}

function emptyQueueData(): QueueData {
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