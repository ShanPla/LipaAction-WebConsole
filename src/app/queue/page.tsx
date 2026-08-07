"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiHeader } from "@/components/queue/KpiHeader";
import { ClusterCard } from "@/components/queue/ClusterCard";
import { QueueTabs } from "@/components/queue/QueueTabs";
import { ReportRow } from "@/components/queue/ReportRow";
import { Button } from "@/components/ui/Button";
import {
  activeFloodingCluster,
  queueByTab,
  queueKpiSummary,
  queueTabMeta,
} from "@/data/mockQueue";
import type { QueueTabId } from "@/types";

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTabId>("emergency");
  const rows = queueByTab[activeTab];

  return (
    <AppShell
      breadcrumb={["Brgy. Tambo", "Queue"]}
      actions={
        <>
          <Button variant="secondary" size="sm">
            Manual report
          </Button>
          <Button variant="primary" size="sm">
            Validate next
          </Button>
        </>
      }
    >
      <KpiHeader summary={queueKpiSummary} />

      {activeTab === "emergency" && <ClusterCard cluster={activeFloodingCluster} />}

      <QueueTabs tabs={queueTabMeta} activeTab={activeTab} onChange={setActiveTab} />

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-500">
            No reports in this queue right now.
          </p>
        ) : (
          rows.map((report) => <ReportRow key={report.id} report={report} />)
        )}
      </div>

      <p className="mt-3 text-xs text-ink-500">
        Showing {rows.length} report{rows.length === 1 ? "" : "s"} &middot; sorted by SLA due
        time
      </p>
    </AppShell>
  );
}
