"use client";

import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { Button } from "@/components/ui/Button";
import { ReasonPromptModal } from "@/components/ui/ReasonPromptModal";
import { isReviewable, statusLabel, useReportReview, type Verdict } from "./useReportReview";
import type { QueueReport } from "@/types";

export function ReportRow({
  report,
  // Owned by QueueClient, not by this row: the same report can also be
  // resolved from the detail drawer, and the row has to reflect that.
  resolvedAs,
  onResolved,
  onOpenDetails,
}: {
  report: QueueReport;
  resolvedAs?: Verdict;
  onResolved: (verdict: Verdict) => void;
  onOpenDetails: () => void;
}) {
  const { isPending, isRejecting, openReject, cancelReject, validate, reject } = useReportReview(
    report.id,
    onResolved
  );

  if (resolvedAs) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-500 last:border-0">
        <span className="font-mono text-xs">{report.id}</span>
        <span>
          {resolvedAs === "validated" ? "Validated — moved to Recent validated" : "Rejected"}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-ink-50/60">
        {/* The whole summary block opens the detail drawer. A report is
            reviewed on the strength of what it says, and the row only shows a
            truncated line of it. */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="min-w-0 flex-1 text-left"
          aria-label={`View details for ${report.id}`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-500">{report.id}</span>
            <PriorityBadge priority={report.priority} />
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
            <span>{report.timestamp}</span>
            <span aria-hidden>·</span>
            <ReporterChip reporter={report.reporter} />
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {/* The Recent validated tab renders this same row. A report already
              past review shows its outcome instead of buttons that would only
              fail — and leaving no [data-validate-button] behind is also what
              keeps [Validate next] from landing on a decided report. */}
          {isReviewable(report.details.status) ? (
            <>
              <Button variant="secondary" size="sm" disabled={isPending} onClick={openReject}>
                Reject
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
                Validate
              </Button>
            </>
          ) : (
            <span className="text-xs font-medium text-ink-500">
              {statusLabel(report.details.status)}
            </span>
          )}
        </div>
      </div>

      {isRejecting && (
        <ReasonPromptModal
          title={`Reject ${report.id}?`}
          description="A reason is required — it's recorded on the report and shown to your barangay's desk."
          confirmLabel="Reject report"
          onCancel={cancelReject}
          onConfirm={reject}
        />
      )}
    </>
  );
}
