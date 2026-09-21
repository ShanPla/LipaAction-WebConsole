"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { routeReport } from "@/app/actions/reports";
import { callAction, NO_ANSWER } from "@/lib/callAction";

/**
 * The route-to-agency flow, shared by the queue row and the detail drawer,
 * for the same reason useReportReview is shared: two entry points must not
 * drift on the confirmation step or on how a partial run is reported.
 *
 * No local [routed] mark is kept. routeReport revalidates /queue, so the
 * report comes back with its new status and agency rows in the same
 * response — the server's answer is the only one shown.
 */
export function useReportRouting(reportId: string) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);

  function route() {
    startTransition(async () => {
      const result = await callAction(() => routeReport(reportId));
      setIsConfirming(false);
      if (result === null) {
        // Routing is irreversible: never guess which way it went. The queue's
        // live update shows whether the agencies have it.
        showToast(NO_ANSWER, "danger");
        return;
      }
      if (result.success) {
        const count = result.agencyCount ?? 0;
        showToast(
          `${reportId} routed to ${count === 1 ? "1 agency" : `${count} agencies`}`,
          "success"
        );
      } else {
        showToast(result.message ?? "Couldn't route this report", "danger");
      }
    });
  }

  return {
    isPending,
    isConfirming,
    openConfirm: () => setIsConfirming(true),
    cancelConfirm: () => setIsConfirming(false),
    route,
  };
}
