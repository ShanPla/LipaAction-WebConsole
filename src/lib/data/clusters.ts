import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, reporterLabel } from "@/lib/utils";
import type { ClusterExplorerEntry, ClusterMemberDetail } from "@/types";

const PENDING_STATUSES = ["pending_priority", "prioritized"];
const PRIORITY_ORDER: Record<string, number> = { Critical: 3, High: 2, Medium: 1, Low: 0 };

interface RawReport {
  id: string;
  category: string;
  priority_name: "Low" | "Medium" | "High" | "Critical" | null;
  status: string;
  identity_withheld: boolean;
  created_at: string;
  cluster_id: string | null;
}

export interface ClusterData {
  clusters: ClusterExplorerEntry[];
  // True when the query failed. An empty list is the normal state of this
  // page today (nothing writes cluster_id yet), so without this flag an
  // outage and the expected emptiness would be the same screen.
  loadFailed: boolean;
}

/**
 * Groups this barangay's pending incident_reports by cluster_id — the
 * duplicate-flagging algorithm's output. A cluster only counts as an actual
 * duplicate group here if 2+ pending reports share the same cluster_id.
 *
 * Known simplification: there's no dedicated `clusters` table with a real
 * centroid/radius, and no pairwise proximity signals (visual hash, temporal
 * delta, sitio) are persisted anywhere accessible — those were only ever
 * computed transiently by the duplicate-flagging algorithm at cluster time,
 * not stored per-pair. radiusMeters/centroidLabel and the per-member
 * proximity fields are therefore approximated or omitted rather than real
 * geospatial output. Revisit if/when a real clusters table or a geospatial
 * RPC gets added on the backend.
 */
export async function getBarangayClusters(
  barangayId: string,
  barangayName: string
): Promise<ClusterData> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("incident_reports")
    .select("id, category, priority_name, status, identity_withheld, created_at, cluster_id")
    .eq("incident_barangay_id", barangayId)
    .not("cluster_id", "is", null)
    // Status filtered in SQL, not after the fact: this used to fetch every
    // clustered report the barangay ever had and discard the decided ones in
    // JS. The JS filter below stays as a harmless second check.
    .in("status", PENDING_STATUSES)
    // Ascending so the earliest-created report in each group is "Primary".
    .order("created_at", { ascending: true })
    // Far above any real cluster volume; a bound, not a page size.
    .limit(500);

  if (error || !data) {
    console.error("[cluster-explorer] load failed", error?.code, error?.message);
    return { clusters: [], loadFailed: true };
  }

  const rows = data as RawReport[];
  const pending = rows.filter((r) => PENDING_STATUSES.includes(r.status));

  const groups = new Map<string, RawReport[]>();
  for (const r of pending) {
    if (!r.cluster_id) continue;
    const group = groups.get(r.cluster_id) ?? [];
    group.push(r);
    groups.set(r.cluster_id, group);
  }

  const entries: ClusterExplorerEntry[] = [];

  for (const [clusterId, group] of groups) {
    if (group.length < 2) continue; // not actually a duplicate group

    // Ordering only: an unscored member ranks below every tier when picking
    // the cluster's headline status. Its own badge still says Not scored.
    const highestPriority = group.reduce((worst, r) => {
      const p = r.priority_name ?? "Low";
      return (PRIORITY_ORDER[p] ?? 0) > (PRIORITY_ORDER[worst] ?? 0) ? p : worst;
    }, "Low");

    const members: ClusterMemberDetail[] = group.map((r, idx) => ({
      reportId: r.id,
      category: categoryLabel(r.category),
      priority: r.priority_name,
      relationship: idx === 0 ? "Primary" : "Related",
      timestamp: timeAgo(r.created_at),
      reporter: {
        name: reporterLabel(r.identity_withheld),
        identityWithheld: r.identity_withheld,
      },
      // visualHash / temporalDeltaSeconds / sitio intentionally omitted — no
      // real backing data. MemberPanel already renders that row conditionally.
    }));

    entries.push({
      id: clusterId,
      category: categoryLabel(group[0].category),
      memberCount: group.length,
      status: statusFromPriority(highestPriority),
      // No radiusMeters — see the "Known simplification" note above.
      centroidLabel: barangayName,
      members,
    });
  }

  return { clusters: entries.sort((a, b) => b.memberCount - a.memberCount), loadFailed: false };
}

function statusFromPriority(priority: string): ClusterExplorerEntry["status"] {
  if (priority === "Critical") return "Critical";
  if (priority === "High") return "High";
  return "Standard";
}

function timeAgo(isoString: string): string {
  const diffMin = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}