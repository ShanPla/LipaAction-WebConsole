"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClusterList } from "@/components/cluster-explorer/ClusterList";
import { MemberPanel } from "@/components/cluster-explorer/MemberPanel";
import { MapPanel } from "@/components/cluster-explorer/MapPanel";
import type { ClusterExplorerEntry } from "@/types";
import type { OfficialProfile } from "@/lib/auth";

export function ClusterExplorerClient({
  official,
  clusters,
}: {
  official: OfficialProfile;
  clusters: ClusterExplorerEntry[];
}) {
  const hasClusters = clusters.length > 0;
  const [activeId, setActiveId] = useState(hasClusters ? clusters[0].id : "");
  const activeCluster = clusters.find((c) => c.id === activeId);

  return (
    <AppShell breadcrumb={[official.barangayName, "Cluster Explorer"]} official={official}>
      {!hasClusters ? (
        <div className="flex h-[calc(100vh-6.5rem)] items-center justify-center rounded-card border border-ink-100 bg-white shadow-panel">
          <div className="text-center">
            <p className="text-sm font-medium text-ink-700">No duplicate clusters right now</p>
            <p className="mt-1 text-xs text-ink-500">
              Clusters appear here when two or more pending reports share the same
              duplicate-flagging cluster.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-auto flex-col gap-4 lg:h-[calc(100vh-6.5rem)] lg:flex-row">
          <ClusterList clusters={clusters} activeId={activeId} onSelect={setActiveId} />
          {activeCluster && <MemberPanel cluster={activeCluster} />}
          {activeCluster && <MapPanel cluster={activeCluster} />}
        </div>
      )}
    </AppShell>
  );
}
