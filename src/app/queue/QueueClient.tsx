"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { playChime } from "@/lib/chime";
import { usePreferences } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/client";
import { KpiHeader } from "@/components/queue/KpiHeader";
import { ClusterCard } from "@/components/queue/ClusterCard";
import { QueueTabs, queuePanelDomId, queueTabDomId } from "@/components/queue/QueueTabs";
import { ReportRow } from "@/components/queue/ReportRow";
import { ReportDetailPanel } from "@/components/queue/ReportDetailPanel";
import { isReviewable, type Verdict } from "@/components/queue/useReportReview";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { QueueReport, QueueTabId } from "@/types";
import type { OfficialProfile } from "@/lib/auth";
import type { QueueData } from "@/lib/data/queue";

// Fallback cadence when the Realtime channel can't be established (network
// that blocks websockets, or the subscription errors). The thesis gives
// Tier 0 a 5-minute SLA; 30 s keeps worst-case staleness well inside that.
const REFRESH_INTERVAL_MS = 30_000;

// Realtime events are coalesced for this long before one refresh: a cluster
// validate is many UPDATEs in a row, and each refresh is a full RSC fetch.
const REALTIME_DEBOUNCE_MS = 500;

type Freshness = "connecting" | "live" | "polling";

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

  // The drawer shows the freshest copy of the selected report, not the
  // snapshot taken when it was clicked. Routing keeps the drawer open and
  // the report comes back from the server with its new status and agency
  // rows; handing the drawer the stale snapshot would leave it offering
  // [Route to agency] on a report that has just been routed. Falls back to
  // the snapshot when the report has left every tab (e.g. rejected).
  const selectedReport = useMemo(() => {
    if (!selected) return null;
    for (const list of Object.values(queueData.queueByTab)) {
      const fresh = list.find((r) => r.id === selected.id);
      if (fresh) return fresh;
    }
    return selected;
  }, [selected, queueData.queueByTab]);

  const router = useRouter();
  const { prefs } = usePreferences(official.role);

  // Live updates. incident_reports is in the supabase_realtime publication
  // and postgres_changes delivery is RLS-filtered per authenticated user
  // (backend owner, 2026-09-11; verified on prod 2026-06-01). The barangay
  // filter is defence in depth on top of that, not the boundary.
  //
  // An event doesn't carry enough to update the screen by itself — priority
  // shaping, tab partitioning, and the KPI count all live server-side — so
  // each event just asks the server component to re-run: router.refresh()
  // streams new props in, and React state here (active tab, search, resolved
  // marks) survives it. Refreshes are held while any dialog is open, so a
  // drawer or reject prompt never has its report swapped out from under a
  // decision; the held refresh runs as soon as the dialog closes. The dialog
  // check reads the DOM because the modals live in ReportRow and ClusterCard
  // and this component doesn't see them open.
  const [freshness, setFreshness] = useState<Freshness>("connecting");
  useEffect(() => {
    const supabase = createClient();
    let debounce: number | undefined;
    let heldUntilDialogCloses: number | undefined;

    function refreshWhenClear() {
      if (document.querySelector('[role="dialog"]')) {
        window.clearInterval(heldUntilDialogCloses);
        heldUntilDialogCloses = window.setInterval(() => {
          if (document.querySelector('[role="dialog"]')) return;
          window.clearInterval(heldUntilDialogCloses);
          router.refresh();
        }, 1000);
        return;
      }
      router.refresh();
    }

    function onChange() {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(refreshWhenClear, REALTIME_DEBOUNCE_MS);
    }

    const channel = supabase
      .channel(`queue:${official.barangayId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incident_reports",
          filter: `incident_barangay_id=eq.${official.barangayId}`,
        },
        onChange
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setFreshness("live");
        // Any failure state falls back to polling below rather than going
        // silent — the page must never look live when it isn't.
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setFreshness("polling");
        }
      });

    return () => {
      window.clearTimeout(debounce);
      window.clearInterval(heldUntilDialogCloses);
      void supabase.removeChannel(channel);
    };
  }, [router, official.barangayId]);

  // Polling, only while the channel isn't delivering. Same dialog and
  // visibility rules.
  useEffect(() => {
    if (freshness === "live") return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (document.querySelector('[role="dialog"]')) return;
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router, freshness]);

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

  // The local [resolved] mark bridges the moment between a decision and the
  // refreshed data arriving. Once the server says a report is past review,
  // its real state wins — otherwise a report validated from the Emergency
  // tab reappears in Recent validated still wearing its collapsed
  // [Validated] mark, hiding the Route button it now needs.
  function renderRow(report: QueueReport) {
    return (
      <ReportRow
        key={report.id}
        report={report}
        resolvedAs={isReviewable(report.details.status) ? resolved[report.id] : undefined}
        onResolved={(verdict) => setResolved((prev) => ({ ...prev, [report.id]: verdict }))}
        onOpenDetails={() => setSelected(report)}
      />
    );
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
        ) : activeTab === "validated" ? (
          // Two groups, because they ask different things of the official:
          // the first still needs routing — nothing sends a validated report
          // anywhere on its own — and the second is there to watch.
          <>
            <RowGroup
              title="Awaiting routing"
              rows={rows.filter((r) => r.details.status === "validated")}
              renderRow={renderRow}
            />
            <RowGroup
              title="Routed to agencies"
              rows={rows.filter((r) => r.details.status !== "validated")}
              renderRow={renderRow}
            />
          </>
        ) : (
          rows.map(renderRow)
        )}
      </div>

      <p className="mt-3 text-xs text-ink-500">
        {isFiltered
          ? `Showing ${rows.length} of ${unfilteredCount} report${unfilteredCount === 1 ? "" : "s"} in this tab`
          : `Showing ${rows.length} report${rows.length === 1 ? "" : "s"}`}
        {" · "}
        {freshness === "live" && "Live — updates as reports change"}
        {freshness === "polling" && `Live updates unavailable — refreshes every ${REFRESH_INTERVAL_MS / 1000} s`}
        {freshness === "connecting" && "Connecting to live updates…"}
        {receivedAt && ` · Data as of ${formatClock(receivedAt)}`}
      </p>

      {selected && selectedReport && (
        <ReportDetailPanel
          report={selectedReport}
          onClose={() => setSelected(null)}
          onResolved={(verdict) =>
            setResolved((prev) => ({ ...prev, [selected.id]: verdict }))
          }
        />
      )}
    </AppShell>
  );
}

function RowGroup({
  title,
  rows,
  renderRow,
}: {
  title: string;
  rows: QueueReport[];
  renderRow: (report: QueueReport) => React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {title} &middot; {rows.length}
      </h3>
      {rows.map(renderRow)}
    </section>
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
