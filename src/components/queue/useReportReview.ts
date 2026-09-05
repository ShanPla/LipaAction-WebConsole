"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateReportStatus } from "@/app/actions/reports";

export type Verdict = "validated" | "rejected";

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
