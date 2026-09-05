"use client";

import { PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { ReasonPromptModal } from "@/components/ui/ReasonPromptModal";
import { useDismissOnEscape } from "@/components/ui/useDismissOnEscape";
import { isReviewable, statusLabel, useReportReview, type Verdict } from "./useReportReview";
import type { QueueReport } from "@/types";

const entryTierLabels: Record<QueueReport["details"]["entryTier"], string> = {
  emergency: "Emergency fast-triage",
  other_reports: "Standard intake",
};

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

  // Disabled while the reject prompt is stacked on top, so Escape backs
  // out one layer at a time, and while a decision is in flight.
  useDismissOnEscape(onClose, !isRejecting && !isPending);

  const d = report.details;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close report details" className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ink-100 bg-white shadow-panel"
      >
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p id="report-detail-title" className="text-sm font-semibold text-ink-900">
              {report.category}
            </p>
            <p className="truncate font-mono text-xs text-ink-500">{report.id}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </header>

        <div className="flex-1 px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={report.priority} />
            <span className="text-xs text-ink-500">{entryTierLabels[d.entryTier]}</span>
            {d.discreetReporting && (
              <span className="rounded-full bg-priority-mediumBg px-2 py-0.5 text-[11px] font-semibold text-priority-medium">
                Discreet reporting requested
              </span>
            )}
          </div>

          <p className="mb-5 whitespace-pre-wrap text-sm text-ink-900">
            {d.description ?? <span className="text-ink-500">No description provided.</span>}
          </p>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            What the reporter said
          </p>
          <div className="mb-5">
            <Row label="Severity (self-rated)" value={d.severitySelfRating ?? notProvided} />
            <Row label="Anyone hurt" value={d.anyoneHurt ?? notProvided} />
            <Row
              label="Still ongoing"
              value={d.isOngoing === null ? notProvided : d.isOngoing ? "Yes" : "No"}
            />
            <Row label="Safety-net confirmation" value={d.safetyNetConfirmation ?? notProvided} />
            <Row
              label="Attachments"
              value={attachmentSummary(d.hasPhoto, d.hasVideo)}
            />
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Triage
          </p>
          <div className="mb-5">
            <Row
              label="Priority"
              value={
                d.priorityScore === null
                  ? report.priority
                  : `${report.priority} · score ${d.priorityScore}`
              }
            />
            <Row label="Confidence" value={d.confidenceBand ?? notProvided} />
            <Row label="Status" value={statusLabel(d.status)} />
            {d.clusterId && (
              <Row
                label="Duplicate cluster"
                value={<span className="font-mono text-xs">{d.clusterId}</span>}
              />
            )}
          </div>

          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Submission
          </p>
          <div>
            <Row label="Reporter" value={<ReporterChip reporter={report.reporter} />} />
            <Row label="Submitted" value={formatTimestamp(d.submittedAt)} />
            {/* No location row: incident_reports stores a geographic point
                (geom), not an address, and nothing here decodes it into text
                yet. Omitted rather than filled with a placeholder. */}
          </div>
        </div>

        {/* A report opened from the Recent validated tab is already decided —
            review_report() would refuse it with 42501. Show the outcome
            rather than offering an action that cannot succeed. */}
        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-ink-100 bg-white px-5 py-3">
          {isReviewable(d.status) ? (
            <>
              <Button variant="secondary" size="sm" disabled={isPending} onClick={openReject}>
                Reject
              </Button>
              <Button variant="primary" size="sm" disabled={isPending} onClick={validate}>
                Validate
              </Button>
            </>
          ) : (
            <p className="text-xs text-ink-500">
              Already reviewed — no further action available here.
            </p>
          )}
        </footer>
      </aside>

      {isRejecting && (
        <ReasonPromptModal
          title={`Reject ${report.id}?`}
          description="A reason is required — it's recorded on the report and shown to your barangay's desk."
          confirmLabel="Reject report"
          onCancel={cancelReject}
          onConfirm={reject}
        />
      )}
    </div>
  );
}

const notProvided = <span className="text-ink-500">Not provided</span>;

function attachmentSummary(hasPhoto: boolean, hasVideo: boolean): string {
  if (hasPhoto && hasVideo) return "Photo and video";
  if (hasPhoto) return "Photo";
  if (hasVideo) return "Video";
  // Not "None" — a description can arrive from the app as the literal string
  // "None", and the two sat three rows apart meaning different things.
  return "No photo or video";
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
