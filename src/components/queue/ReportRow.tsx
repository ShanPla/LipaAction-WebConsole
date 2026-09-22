"use client";

import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ReasonPromptModal } from "@/components/ui/ReasonPromptModal";
import { cx, timeAgo } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { isReviewable, statusLabel, useReportReview, type Verdict } from "./useReportReview";
import { useReportRouting } from "./useReportRouting";
import { downstreamSummary, routeConfirmCopy, routingState } from "./routing";
import type { QueueReport } from "@/types";

export function ReportRow({
  report,
  // Owned by QueueClient, not by this row: the same report can also be
  // resolved from the detail drawer, and the row has to reflect that.
  resolvedAs,
  // True for a few seconds after this report turned up on its own. Owned by
  // QueueClient, which is the only place that can tell a new report from one
  // that was already on screen.
  justArrived = false,
  // QueueClient's clock, so the age keeps moving while nothing refreshes;
  // null on the first render, which shows the server's own string.
  now = null,
  onResolved,
  onOpenDetails,
}: {
  report: QueueReport;
  resolvedAs?: Verdict;
  justArrived?: boolean;
  now?: number | null;
  onResolved: (verdict: Verdict) => void;
  onOpenDetails: () => void;
}) {
  const { isPending, isRejecting, openReject, cancelReject, validate, reject } = useReportReview(
    report.id,
    onResolved
  );
  const routing = useReportRouting(report.id);
  const state = routingState(report);
  const t = useT();

  if (resolvedAs) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-500 last:border-0">
        <span className="font-mono text-xs">{report.id}</span>
        <span>
          {resolvedAs === "validated" ? t("row.resolvedValidated") : t("status.rejected")}
        </span>
      </div>
    );
  }

  // Past review, the row's action is routing. A report that has been
  // validated but not routed has reached no agency at all — nothing routes
  // on its own — so the button sits exactly where Validate was.
  function renderPastReview() {
    switch (state.kind) {
      case "ready":
        return (
          <Button
            variant="primary"
            size="sm"
            disabled={routing.isPending}
            onClick={routing.openConfirm}
          >
            {t("routing.routeToAgency")}
          </Button>
        );
      case "incomplete":
        return (
          <>
            <span className="text-xs font-medium text-priority-medium">{t("row.routingIncomplete")}</span>
            <Button
              variant="primary"
              size="sm"
              disabled={routing.isPending}
              onClick={routing.openConfirm}
            >
              {t("routing.finish")}
            </Button>
          </>
        );
      case "no-mapping":
        return (
          <span className="max-w-[14rem] text-right text-xs font-medium text-priority-medium">
            {t("row.noMapping")}
          </span>
        );
      case "unavailable":
        return (
          <span className="max-w-[14rem] text-right text-xs text-ink-500">
            {t("row.routingUnavailable")}
          </span>
        );
      case "downstream":
        return (
          <span className="max-w-[16rem] text-right text-xs text-ink-700">
            {downstreamSummary(state, t)}
          </span>
        );
      case "none":
        return (
          <span className="text-xs font-medium text-ink-500">
            {statusLabel(report.details.status, t)}
          </span>
        );
    }
  }

  return (
    <>
      <div
        className={cx(
          "flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-ink-50/60",
          // The tint fades out on its own; with reduced motion it simply
          // holds until QueueClient drops the flag. Either way the New chip
          // below carries the same fact in words, so nothing is said by
          // colour alone.
          justArrived && "motion-safe:animate-arrival motion-reduce:bg-brand-100"
        )}
      >
        {/* The whole summary block opens the detail drawer. A report is
            reviewed on the strength of what it says, and the row only shows a
            truncated line of it. */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="min-w-0 flex-1 text-left"
          aria-label={t("row.viewDetails", { id: report.id })}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-500">{report.id}</span>
            {justArrived && (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                {t("row.new")}
              </span>
            )}
            <PriorityBadge priority={report.priority} score={report.details.priorityScore} />
            {/* Visible before the decision, not only inside the drawer. */}
            {report.details.discreetReporting && (
              <span
                title={t("drawer.discreet")}
                className="rounded-full bg-priority-mediumBg px-2 py-0.5 text-[11px] font-semibold text-priority-medium"
              >
                {t("row.discreet")}
              </span>
            )}
            <span className="text-xs font-medium text-ink-700">{report.category}</span>
          </div>
          <p className="mb-1.5 truncate text-sm text-ink-900">{report.summary}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
            {report.location && (
              <>
                <span>{report.location}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{now === null ? report.timestamp : timeAgo(report.details.submittedAt, now)}</span>
            <span aria-hidden>·</span>
            <ReporterChip reporter={report.reporter} />
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {/* The Recent validated tab renders this same row. A report already
              past review shows its routing state instead of review buttons
              that would only fail — and leaving no [data-validate-button]
              behind is also what keeps [Validate next] from landing on a
              decided report. */}
          {isReviewable(report.details.status) ? (
            <>
              <Button variant="secondary" size="sm" disabled={isPending} onClick={openReject}>
                {t("review.reject")}
              </Button>
              {/* data-validate-button: QueueClient's [Validate next] finds the
                  first one of these to scroll to and focus. */}
              <Button
                variant="primary"
                size="sm"
                data-validate-button
                disabled={isPending}
                onClick={validate}
              >
                {t("review.validate")}
              </Button>
            </>
          ) : (
            renderPastReview()
          )}
        </div>
      </div>

      {isRejecting && (
        <ReasonPromptModal
          title={t("review.rejectTitle", { id: report.id })}
          description={t("review.rejectDescription")}
          confirmLabel={t("review.rejectConfirm")}
          onCancel={cancelReject}
          onConfirm={reject}
        />
      )}

      {routing.isConfirming && (state.kind === "ready" || state.kind === "incomplete") && (
        <ConfirmModal
          {...routeConfirmCopy(report, state.plan, state.kind === "incomplete", t)}
          busy={routing.isPending}
          onCancel={routing.cancelConfirm}
          onConfirm={routing.route}
        />
      )}
    </>
  );
}
