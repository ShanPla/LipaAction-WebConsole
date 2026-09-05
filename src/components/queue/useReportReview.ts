"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateReportStatus } from "@/app/actions/reports";

export type Verdict = "validated" | "rejected";

/**
 * The statuses review_report() will still accept a decision on. Anything past
 * these has already been reviewed (or routed onward), and the RPC rejects it
 * with 42501.
 *
 * Kept in step with PENDING_STATUSES in src/lib/data/queue.ts. The Recent
 * validated tab renders the same ReportRow as the working tabs, so without
 * this check an official is offered Validate and Reject on a report that was
 * decided days ago — the click would simply fail.
 */
const REVIEWABLE_STATUSES = ["pending_priority", "prioritized"];

export function isReviewable(status: string): boolean {
  return REVIEWABLE_STATUSES.includes(status);
}

// incident_reports.status is free text from the backend; these are the values
// seen so far. Anything unrecognised falls through as-is rather than being
// hidden or guessed at. Shared so the row and the drawer can't show the same
// report as [Validated] in one place and [validated] in the other.
const STATUS_LABELS: Record<string, string> = {
  pending_priority: "Pending",
  prioritized: "Prioritized",
  validated: "Validated",
  rejected: "Rejected",
  routed: "Routed to agency",
  resolved: "Resolved",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * The validate/reject flow, shared by the queue row and the detail drawer.
 *
 * Extracted so the two entry points cannot drift: both must require a reason
 * to reject, both must report the RPC's error message rather than a generic
 * failure, and both must agree on what happened. Whether a report has been
 * resolved is deliberately NOT held here — that lives in QueueClient, so a
 * report validated from the drawer is also struck through in the row behind
 * it. Two copies of this hook would each believe their own version.
 */
export function useReportReview(reportId: string, onResolved: (verdict: Verdict) => void) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isRejecting, setIsRejecting] = useState(false);

  function validate() {
    startTransition(async () => {
      const result = await updateReportStatus(reportId, "validated");
      if (result.success) {
        onResolved("validated");
        showToast(`${reportId} validated`, "success");
      } else {
        showToast(result.message ?? "Failed to update report", "danger");
      }
    });
  }

  function reject(reason: string) {
    setIsRejecting(false);
    startTransition(async () => {
      const result = await updateReportStatus(reportId, "rejected", reason);
      if (result.success) {
        onResolved("rejected");
        showToast(`${reportId} rejected`, "danger");
      } else {
        showToast(result.message ?? "Failed to update report", "danger");
      }
    });
  }

  return {
    isPending,
    isRejecting,
    openReject: () => setIsRejecting(true),
    cancelReject: () => setIsRejecting(false),
    validate,
    reject,
  };
}
