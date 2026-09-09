"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { playChime } from "@/lib/chime";
import { usePreferences } from "@/lib/preferences";
import { KpiHeader } from "@/components/queue/KpiHeader";
import { ClusterCard } from "@/components/queue/ClusterCard";
import { QueueTabs, queuePanelDomId, queueTabDomId } from "@/components/queue/QueueTabs";
import { ReportRow } from "@/components/queue/ReportRow";
import { ReportDetailPanel } from "@/components/queue/ReportDetailPanel";
import type { Verdict } from "@/components/queue/useReportReview";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { QueueReport, QueueTabId } from "@/types";
import type { OfficialProfile } from "@/lib/auth";
import type { QueueData } from "@/lib/data/queue";

// How often the queue re-fetches while open. The thesis calls the queue
// real-time (§3.11 tests it; report #6 is marked real-time) and gives Tier 0
// a 5-minute SLA; 30 s keeps the worst-case staleness well inside that
// without Supabase Realtime, which needs a publication grant the backend
// hasn't confirmed. Cheap: one RSC fetch, three narrow queries.
const REFRESH_INTERVAL_MS = 30_000;

// Fast-triage SLA from the thesis (p.102): a Tier 0 report should have a
// decision within 5 minutes of submission.
const TIER0_SLA_MS = 5 * 60_000;

export function QueueClient({
  official,
  queueData,
}: {
  official: OfficialProfile;
  queueData: QueueData;
}) {
  const [activeTab, setActiveTab] = useState<QueueTabId>("emergency");
  const [query, setQuery] = useState("");
  const { showToast } = useToast();

  // Filters the active tab's rows only. Report ID, category, and description
  // are the searchable fields — deliberately not reporter or address, which
  // the old placeholder advertised: reporter names are never exposed to
  // officials, and incident_reports has no address column at all.
  const rows = useMemo(() => {
    const tabRows = queueData.queueByTab[activeTab];
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) return tabRows;
    return tabRows.filter((report) =>
      [report.id, report.category, report.summary].some((field) =>
        field.toLowerCase().includes(trimmed)
      )
    );
  }, [queueData.queueByTab, activeTab, query]);

  const unfilteredCount = queueData.queueByTab[activeTab].length;
  const isFiltered = query.trim().length > 0;
  const listRef = useRef<HTMLDivElement>(null);

  // Held here rather than inside each row: a report can be resolved from its
  // row or from the detail drawer, and both surfaces have to agree.
  const [resolved, setResolved] = useState<Record<string, Verdict>>({});
  const [selected, setSelected] = useState<QueueReport | null>(null);

  const router = useRouter();
  const { prefs } = usePreferences(official.role);

  // Periodic refresh. router.refresh() re-runs the server component and
  // streams new props in; React state here (active tab, search, resolved
  // marks) survives it. Skipped while the tab is hidden — nobody is looking —
  // and while any dialog is open, so a drawer or reject prompt never has its
  // report swapped out from under a decision. The dialog check reads the DOM
  // rather than tracking each modal's state, because the modals live in
  // ReportRow and ClusterCard and this component doesn't see them open.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (document.querySelector('[role="dialog"]')) return;
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  // When the data on screen was last received — the honest version of a
  // [Live] badge. Set on every new queueData, including the first.
  const [receivedAt, setReceivedAt] = useState<Date | null>(null);
  useEffect(() => {
    setReceivedAt(new Date());
  }, [queueData]);

  // Audible alert: chime when a Tier 0 report appears that wasn't in the
  // previous fetch. The first fetch seeds the set without chiming — the
  // official just opened the page and can see everything on it. Ids are
  // compared, not counts: a count stays flat when one report is validated
  // and another arrives in the same interval.
  const knownEmergencyIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const emergencies = queueData.queueByTab.emergency;
    const ids = new Set(emergencies.map((r) => r.id));
    if (knownEmergencyIds.current === null) {
      knownEmergencyIds.current = ids;
      return;
    }
    const previous = knownEmergencyIds.current;
    knownEmergencyIds.current = ids;
    const arrived = emergencies.some((r) => !previous.has(r.id));
    if (arrived && prefs.audibleAlertNewEmergency) playChime();
  }, [queueData.queueByTab.emergency, prefs.audibleAlertNewEmergency]);

  // SLA breach: one browser notification per Tier 0 report the first time it
  // is seen past the 5-minute window, and only with permission already
  // granted — Settings is where permission is requested, on the toggle.
  // Category and report id only; never anything about the reporter.
  const notifiedBreachIds = useRef(new Set<string>());
  useEffect(() => {
    if (!prefs.slaBreachBrowserNotification) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const now = Date.now();
    for (const report of queueData.queueByTab.emergency) {
      if (resolved[report.id] || notifiedBreachIds.current.has(report.id)) continue;
      const waitedMs = now - new Date(report.details.submittedAt).getTime();
      if (waitedMs < TIER0_SLA_MS) continue;
      notifiedBreachIds.current.add(report.id);
      new Notification("Tier 0 report past its 5-minute window", {
        body: `${report.category} · ${report.id}`,
        tag: report.id,
      });
    }
  }, [queueData.queueByTab.emergency, prefs.slaBreachBrowserNotification, resolved]);

  /**
   * Moves the official to the next report awaiting a decision: scrolls the
   * top row of the active tab into view and puts focus on its Validate
   * button, so the keyboard is already where the work is.
   *
   * It does NOT validate anything, and it does not open the detail drawer —
   * that opens from a row's Details button. The button previously claimed
   * to open a report for validation when no such view existed.
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
      search={{
        value: query,
        onChange: setQuery,
        placeholder: "Search report ID, category, description…",
        label: "Search this tab by report ID, category, or description",
      }}
    >
      {queueData.loadFailed && <DataUnavailableBanner what="The queue" />}
      <KpiHeader summary={queueData.kpiSummary} />

      {activeTab === "emergency" && queueData.activeCluster && (
        <ClusterCard cluster={queueData.activeCluster} />
      )}

      <QueueTabs tabs={queueData.queueTabMeta} activeTab={activeTab} onChange={setActiveTab} />

      <div
        ref={listRef}
        role="tabpanel"
        id={queuePanelDomId(activeTab)}
        aria-labelledby={queueTabDomId(activeTab)}
        className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel"
      >
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-500">
            {isFiltered
              ? `No reports in this tab match “${query.trim()}”.`
              : "No reports in this queue right now."}
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
        {isFiltered
          ? `Showing ${rows.length} of ${unfilteredCount} report${unfilteredCount === 1 ? "" : "s"} in this tab`
          : `Showing ${rows.length} report${rows.length === 1 ? "" : "s"}`}
        {" · "}
        Refreshes every {REFRESH_INTERVAL_MS / 1000} s
        {receivedAt && ` · Data as of ${formatClock(receivedAt)}`}
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

// Manila, like every other time on the console.
function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
