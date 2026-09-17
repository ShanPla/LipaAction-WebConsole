"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClusterList } from "@/components/cluster-explorer/ClusterList";
import { MemberPanel } from "@/components/cluster-explorer/MemberPanel";
import { MapPanel } from "@/components/cluster-explorer/MapPanel";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import type { OfficialProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { ClusterData } from "@/lib/data/clusters";

export function ClusterExplorerClient({
  official,
  clusterData,
}: {
  official: OfficialProfile;
  clusterData: ClusterData;
}) {
  const { clusters, loadFailed } = clusterData;
  const hasClusters = clusters.length > 0;
  const [activeId, setActiveId] = useState(hasClusters ? clusters[0].id : "");
  const activeCluster = clusters.find((c) => c.id === activeId);

  return (
    <AppShell breadcrumb={[official.barangayName, "Cluster Explorer"]} official={official}>
      {loadFailed && <DataUnavailableBanner what="Cluster Explorer" />}
      {!hasClusters ? (
        // Not shown under a load failure: the banner already says nothing
        // here is current, and [not connected yet] would misstate an outage.
        !loadFailed && (
          <div className="flex h-[calc(100vh-6.5rem)] items-center justify-center rounded-card border border-ink-100 bg-white px-4 shadow-panel">
            {/* The previous copy — [No duplicate clusters right now] — read
                as a finding. It was a wiring gap: the backend's duplicate
                flagger computes clusters but never writes them back, so
                this page is empty no matter what is filed. The backend
                owner asked for that to be stated on screen (2026-09-17).
                When cluster write-back ships this copy becomes false and
                must change; nothing here can detect that on its own. */}
            <div className="max-w-md text-center">
              <p className="text-sm font-medium text-ink-700">
                Duplicate detection isn&apos;t connected yet
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Reports aren&apos;t being grouped into clusters yet, so this page stays empty —
                that doesn&apos;t mean there are no duplicates. Once grouping is switched on,
                clusters of two or more related reports will appear here. Reports sent without
                a location, including every identity-withheld report, can&apos;t be grouped.
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Hindi pa nakakonekta ang pagtukoy ng duplicate.
              </p>
            </div>
          </div>
        )
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
