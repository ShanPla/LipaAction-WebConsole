"use client";

import { useEffect, useRef } from "react";
import { logReportView } from "@/app/actions/audit";
import { callAction } from "@/lib/callAction";
import { useT, type Translate } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import { PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { ReasonPromptModal } from "@/components/ui/ReasonPromptModal";
import { useDismissOnEscape } from "@/components/ui/useDismissOnEscape";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { isReviewable, statusLabel, useReportReview, type Verdict } from "./useReportReview";
import { useReportRouting } from "./useReportRouting";
import { agencyProgressLabel, routeConfirmCopy, routingState } from "./routing";
import type { AgencyRouting, QueueReport, RoutingPlanEntry } from "@/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-2.5 last:border-0">
      <p className="shrink-0 text-xs font-medium text-ink-500">{label}</p>
      <div className="text-right text-sm text-ink-900">{value}</div>
    </div>
  );
}

/**
 * Everything the barangay knows about one report, so an official can judge it
 * before deciding. The queue row shows category, priority, and a truncated
 * line; that is not enough to validate an emergency on.
 *
 * Free-text answers from the mobile app (severity, injuries, safety-net
 * confirmation) are printed verbatim. Their wording belongs to the app, and
 * restating them in this console's own words would misrepresent what the
 * resident actually said.
 */
export function ReportDetailPanel({
  report,
  onClose,
  onResolved,
}: {
  report: QueueReport;
  onClose: () => void;
  onResolved: (verdict: Verdict) => void;
}) {
  const { isPending, isRejecting, openReject, cancelReject, validate, reject } = useReportReview(
    report.id,
    (verdict) => {
      onResolved(verdict);
      onClose();
    }
  );

  // Unlike a decision, routing leaves the drawer open: the report stays in
  // this barangay's view afterwards, and the official can watch the agency
  // rows appear. QueueClient hands the drawer the freshest copy of the
  // report after each refresh, so this re-renders from the server's answer.
  const routing = useReportRouting(report.id);
  const routeState = routingState(report);
  const { showToast } = useToast();
  const t = useT();

  // Disabled while a prompt is stacked on top — the reject reason or the
  // routing confirmation — so Escape backs out one layer at a time, and
  // while a write is in flight.
  const stacked = isRejecting || routing.isConfirming;
  const writing = isPending || routing.isPending;
  useDismissOnEscape(onClose, !stacked && !writing);

  // The scrim and the close button honour the same rule as Escape: not while
  // a write is in flight. Closing mid-write unmounted the hook that owned the
  // result, so the official never saw whether it landed.
  const closeUnlessWriting = () => {
    if (!writing) onClose();
  };
  // Same stacking rule for Tab: whichever prompt is up owns focus.
  const dialogRef = useFocusTrap<HTMLElement>(!stacked);

  // The access trail is written here, on mount, rather than where the row is
  // clicked: opening this panel is the moment the reporter's own account of
  // the incident reaches an official's screen, and that is the event the DPA
  // trail exists to record.
  //
  // Exactly once per opening. log_report_view() appends a row on every call,
  // so React StrictMode's deliberate double-run of effects in development
  // would write the view twice — the ref survives that double-run and stops
  // the second. Closing and reopening the drawer unmounts the component, so a
  // genuine second look does get its own row.
  //
  // Never blocks the read: an official must not be locked out of a report
  // because the logger is down. A failure isn't hidden either — an access
  // trail with a silent gap is worse than one with a visible complaint.
  const loggedReportId = useRef<string | null>(null);
  useEffect(() => {
    if (loggedReportId.current === report.id) return;
    loggedReportId.current = report.id;
    // callAction: a rejected promise here used to be an unhandled rejection —
    // a missed access-log entry with no trace on screen at all.
    void callAction(() => logReportView(report.id)).then((result) => {
      const outcome = result ?? "failed";
      if (outcome === "logged") return;
      showToast(t(outcome === "session-expired" ? "drawer.sessionExpired" : "drawer.notLogged"), "danger");
    });
    // Switching language changes t and re-runs this effect; the ref above
    // turns that rerun into a no-op, so the view is still logged once.
  }, [report.id, showToast, t]);

  const d = report.details;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={t("drawer.close")}
        className="absolute inset-0 bg-ink-900/40 motion-safe:animate-scrimIn"
        onClick={closeUnlessWriting}
      />

      <aside
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        // Slides in from the edge it occupies, so it reads as a panel over
        // the queue rather than a new page.
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ink-100 bg-white shadow-panel focus:outline-none motion-safe:animate-drawerIn"
      >
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p id="report-detail-title" className="text-sm font-semibold text-ink-900">
              {report.category}
            </p>
            <p className="truncate font-mono text-xs text-ink-500">{report.id}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={closeUnlessWriting} aria-label={t("common.close")}>
            ✕
          </Button>
        </header>

        <div className="flex-1 px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={report.priority} />
            <span className="text-xs text-ink-500">{t(`drawer.tier.${d.entryTier}`)}</span>
            {d.discreetReporting && (
              <span className="rounded-full bg-priority-mediumBg px-2 py-0.5 text-[11px] font-semibold text-priority-medium">
                {t("drawer.discreet")}
              </span>
            )}
          </div>

          <p className="mb-5 whitespace-pre-wrap text-sm text-ink-900">
            {d.description ?? <span className="text-ink-500">{t("drawer.noDescription")}</span>}
          </p>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {t("drawer.section.reporterSaid")}
          </p>
          <div className="mb-5">
            <Row label={t("drawer.severity")} value={d.severitySelfRating ?? <NotProvided />} />
            <Row label={t("drawer.anyoneHurt")} value={d.anyoneHurt ?? <NotProvided />} />
            <Row
              label={t("drawer.ongoing")}
              value={d.isOngoing === null ? <NotProvided /> : t(d.isOngoing ? "drawer.yes" : "drawer.no")}
            />
            <Row label={t("drawer.safetyNet")} value={d.safetyNetConfirmation ?? <NotProvided />} />
            <Row
              label={t("drawer.attachments")}
              value={attachmentSummary(d.hasPhoto, d.hasVideo, t)}
            />
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {t("drawer.section.triage")}
          </p>
          <div className="mb-5">
            <Row
              label={t("drawer.priority")}
              value={
                report.priority === null
                  ? <span className="text-ink-500">{t("drawer.notScoredYet")}</span>
                  : d.priorityScore === null
                    ? report.priority
                    : t("drawer.score", { priority: report.priority, score: d.priorityScore })
              }
            />
            <Row label={t("drawer.confidence")} value={d.confidenceBand ?? <NotProvided />} />
            <Row label={t("drawer.status")} value={statusLabel(d.status, t)} />
            {d.clusterId && (
              <Row
                label={t("drawer.cluster")}
                value={<span className="font-mono text-xs">{d.clusterId}</span>}
              />
            )}
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            {t("drawer.section.submission")}
          </p>
          <div>
            <Row label={t("field.reporter")} value={<ReporterChip reporter={report.reporter} />} />
            <Row label={t("drawer.submitted")} value={formatTimestamp(d.submittedAt)} />
            {/* No location row: incident_reports stores a geographic point
                (geom), not an address, and nothing here decodes it into text
                yet. Omitted rather than filled with a placeholder. */}
          </div>

          {routeState.kind !== "none" && (
            <>
              <p className="mb-1.5 mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                {t("drawer.section.routing")}
              </p>
              <RoutingSection state={routeState} />
            </>
          )}
        </div>

        {/* Past review, the drawer's action is routing — the same one the
            row offers. A decided report can't be reviewed again
            (review_report() refuses it with 42501), so review buttons never
            show here for one. */}
        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-ink-100 bg-white px-5 py-3">
          {isReviewable(d.status) ? (
            <>
              <Button variant="secondary" size="sm" disabled={isPending} onClick={openReject}>
                {t("review.reject")}
              </Button>
              <Button variant="primary" size="sm" disabled={isPending} onClick={validate}>
                {t("review.validate")}
              </Button>
            </>
          ) : routeState.kind === "ready" || routeState.kind === "incomplete" ? (
            <Button
              variant="primary"
              size="sm"
              disabled={routing.isPending}
              onClick={routing.openConfirm}
            >
              {t(routeState.kind === "ready" ? "routing.routeToAgency" : "routing.finish")}
            </Button>
          ) : (
            <p className="text-xs text-ink-500">{footerNote(routeState.kind, t)}</p>
          )}
        </footer>
      </aside>

      {isRejecting && (
        <ReasonPromptModal
          title={t("review.rejectTitle", { id: report.id })}
          description={t("review.rejectDescription")}
          confirmLabel={t("review.rejectConfirm")}
          onCancel={cancelReject}
          onConfirm={reject}
        />
      )}

      {routing.isConfirming && (routeState.kind === "ready" || routeState.kind === "incomplete") && (
        <ConfirmModal
          {...routeConfirmCopy(report, routeState.plan, routeState.kind === "incomplete", t)}
          busy={routing.isPending}
          onCancel={routing.cancelConfirm}
          onConfirm={routing.route}
        />
      )}
    </div>
  );
}

function footerNote(kind: ReturnType<typeof routingState>["kind"], t: Translate): string {
  switch (kind) {
    case "no-mapping":
      return t("drawer.footer.noMapping");
    case "unavailable":
      return t("drawer.footer.unavailable");
    case "downstream":
      return t("drawer.footer.downstream");
    default:
      return t("drawer.footer.reviewed");
  }
}

/**
 * What the drawer shows about agencies. Before routing: where it would go.
 * After: each agency and how far it has got, read from agency_routing's
 * timestamps (there is no status column there). The desk can't change any
 * of it — agency roles do.
 */
function RoutingSection({ state }: { state: ReturnType<typeof routingState> }) {
  const t = useT();
  switch (state.kind) {
    case "ready":
      return <PlanList plan={state.plan} lead={t("drawer.plan.willRoute")} />;
    case "incomplete":
      return (
        <div>
          <p className="mb-2 text-xs text-priority-medium">
            {t("drawer.incomplete")}
          </p>
          <AgencyList rows={state.routing} />
          {state.plan && <PlanList plan={state.plan} lead={t("drawer.plan.finishing")} />}
        </div>
      );
    case "no-mapping":
      return (
        <p className="text-sm text-ink-700">{t("drawer.noMapping")}</p>
      );
    case "unavailable":
      return (
        <p className="text-sm text-ink-500">{t("drawer.unavailable")}</p>
      );
    case "downstream":
      return state.routing.length > 0 ? (
        <AgencyList rows={state.routing} />
      ) : (
        <p className="text-sm text-ink-500">{t("drawer.downstreamMissing")}</p>
      );
    case "none":
      return null;
  }
}

function PlanList({ plan, lead }: { plan: RoutingPlanEntry[]; lead: string }) {
  const t = useT();
  return (
    <div>
      <p className="mb-1 text-xs text-ink-500">{lead}:</p>
      <ul className="text-sm text-ink-900">
        {plan.map((p, i) => (
          <li key={`${i}-${p.agencyName}`} className="py-0.5">
            {p.agencyName}
            {p.isPrimary && <span className="ml-1.5 text-xs text-ink-500">{t("routing.lead")}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Not the shared Row: that keeps its label from shrinking, which suits short
// field names, while agency names run long enough to push the value off the
// drawer.
function AgencyList({ rows }: { rows: AgencyRouting[] }) {
  const t = useT();
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={`${i}-${r.agencyName}`}
          className="flex items-start justify-between gap-4 border-b border-ink-100 py-2.5 last:border-0"
        >
          <p className="min-w-0 text-sm text-ink-900">
            {r.agencyName}
            {r.isPrimary && <span className="ml-1.5 text-xs text-ink-500">{t("routing.lead")}</span>}
          </p>
          <p className="shrink-0 text-right text-sm text-ink-900">
            {agencyProgressLabel(r, t)}
            <span className="block text-[11px] text-ink-500">{stageTime(r, t)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

// When the agency reached the stage it's shown at, so the desk can see how
// long an acknowledgement has taken.
function stageTime(r: AgencyRouting, t: Translate): string {
  if (r.resolvedAt) return t("drawer.stage.closed", { time: formatTimestamp(r.resolvedAt) });
  if (r.acknowledgedAt) return t("drawer.stage.acknowledged", { time: formatTimestamp(r.acknowledgedAt) });
  if (r.routedAt) return t("drawer.stage.routed", { time: formatTimestamp(r.routedAt) });
  return "";
}

function NotProvided() {
  const t = useT();
  return <span className="text-ink-500">{t("drawer.notProvided")}</span>;
}

function attachmentSummary(hasPhoto: boolean, hasVideo: boolean, t: Translate): string {
  if (hasPhoto && hasVideo) return t("drawer.attach.both");
  if (hasPhoto) return t("drawer.attach.photo");
  if (hasVideo) return t("drawer.attach.video");
  // Not "None" — a description can arrive from the app as the literal string
  // "None", and the two sat three rows apart meaning different things.
  return t("drawer.attach.none");
}

// Pinned to Manila even though this runs in the browser: Validation History
// formats the same instants on the server in Asia/Manila, and an official
// whose laptop is set to another zone would otherwise see the two disagree.
function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
