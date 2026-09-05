"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiHeader } from "@/components/queue/KpiHeader";
import { ClusterCard } from "@/components/queue/ClusterCard";
import { QueueTabs } from "@/components/queue/QueueTabs";
import { ReportRow } from "@/components/queue/ReportRow";
import { ReportDetailPanel } from "@/components/queue/ReportDetailPanel";
import type { Verdict } from "@/components/queue/useReportReview";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { QueueReport, QueueTabId } from "@/types";
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
  const listRef = useRef<HTMLDivElement>(null);

  // Held here rather than inside each row: a report can be resolved from its
  // row or from the detail drawer, and both surfaces have to agree.
  const [resolved, setResolved] = useState<Record<string, Verdict>>({});
  const [selected, setSelected] = useState<QueueReport | null>(null);

  /**
   * Moves the official to the next report awaiting a decision: scrolls the
   * top row of the active tab into view and puts focus on its Validate
   * button, so the keyboard is already where the work is.
   *
   * It does NOT validate anything. The button previously claimed to open a
   * report for validation, but there is no report detail view in this app —
   * the queue row is the whole surface. If a detail view is added later, this
   * becomes [open the next report] with no change to the button itself.
   */
  function handleValidateNext() {
    const target = listRef.current?.querySelector<HTMLButtonElement>("[data-validate-button]");
    if (!target) {
      showToast("Nothing left in this tab to validate", "info");
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus();
  }

  return (
    <AppShell
      breadcrumb={[official.barangayName, "Queue"]}
      official={official}
      /* [Manual report] was removed here. incident_reports has exactly one
         INSERT policy — ir_insert_resident, auth_role() = 'resident' AND
         user_id = auth.uid() — so a barangay official cannot file a report at
         all, on anyone's behalf. The button fired a toast saying a form had
         opened; no form existed, and none could work without a backend
         change. */
      actions={
        <Button variant="primary" size="sm" onClick={handleValidateNext}>
          Validate next
        </Button>
      }
    >
      <KpiHeader summary={queueData.kpiSummary} />

      {activeTab === "emergency" && queueData.activeCluster && (
        <ClusterCard cluster={queueData.activeCluster} />
      )}

      <QueueTabs tabs={queueData.queueTabMeta} activeTab={activeTab} onChange={setActiveTab} />

      <div
        ref={listRef}
        className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel"
      >
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-500">
            No reports in this queue right now.
          </p>
        ) : (
          rows.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              resolvedAs={resolved[report.id]}
              onResolved={(verdict) =>
                setResolved((prev) => ({ ...prev, [report.id]: verdict }))
              }
              onOpenDetails={() => setSelected(report)}
            />
          ))
        )}
      </div>

      <p className="mt-3 text-xs text-ink-500">
        Showing {rows.length} report{rows.length === 1 ? "" : "s"}
      </p>

      {selected && (
        <ReportDetailPanel
          report={selected}
          onClose={() => setSelected(null)}
          onResolved={(verdict) =>
            setResolved((prev) => ({ ...prev, [selected.id]: verdict }))
          }
        />
      )}
    </AppShell>
  );
}
