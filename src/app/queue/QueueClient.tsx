"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiHeader } from "@/components/queue/KpiHeader";
import { ClusterCard } from "@/components/queue/ClusterCard";
import { QueueTabs } from "@/components/queue/QueueTabs";
import { ReportRow } from "@/components/queue/ReportRow";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { QueueTabId } from "@/types";
import type { OfficialProfile } from "@/lib/auth";
import type { QueueData } from "@/lib/data/queue";

export function QueueClient({
  official,
  queueData,
}: {
  official: OfficialProfile;
  queueData: QueueData;
}) {
  const [activeTab, setActiveTab] = useState<QueueTabId>("emergency");
  const rows = queueData.queueByTab[activeTab];
  const { showToast } = useToast();

  return (
    <AppShell
      breadcrumb={[official.barangayName, "Queue"]}
      official={official}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => showToast("Manual report form opened", "info")}
          >
            Manual report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              showToast(
                rows.length > 0
                  ? `Opened ${rows[0].id} for validation`
                  : "Queue is empty — nothing to validate",
                "info"
              )
            }
          >
            Validate next
          </Button>
        </>
      }
    >
      <KpiHeader summary={queueData.kpiSummary} />

      {activeTab === "emergency" && queueData.activeCluster && (
        <ClusterCard cluster={queueData.activeCluster} />
      )}

      <QueueTabs tabs={queueData.queueTabMeta} activeTab={activeTab} onChange={setActiveTab} />

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
        Showing {rows.length} report{rows.length === 1 ? "" : "s"}
      </p>
    </AppShell>
  );
}
