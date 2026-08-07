"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ClusterList } from "@/components/cluster-explorer/ClusterList";
import { MemberPanel } from "@/components/cluster-explorer/MemberPanel";
import { MapPanel } from "@/components/cluster-explorer/MapPanel";
import { clusterExplorerEntries } from "@/data/mockClusters";

export default function ClusterExplorerPage() {
  const [activeId, setActiveId] = useState(clusterExplorerEntries[0].id);
  const activeCluster =
    clusterExplorerEntries.find((c) => c.id === activeId) ?? clusterExplorerEntries[0];

  return (
    <AppShell breadcrumb={["Brgy. Tambo", "Cluster Explorer"]}>
      <div className="flex h-[calc(100vh-6.5rem)] gap-4">
        <ClusterList
          clusters={clusterExplorerEntries}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <MemberPanel cluster={activeCluster} />
        <MapPanel cluster={activeCluster} />
      </div>
    </AppShell>
  );
}
