"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { routeReport } from "@/app/actions/reports";
import { callAction } from "@/lib/callAction";
import { useT } from "@/lib/i18n";
import { agencyCount } from "./routing";

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
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);

  function route() {
    startTransition(async () => {
      const result = await callAction(() => routeReport(reportId));
      setIsConfirming(false);
      if (result === null) {
        // Routing is irreversible: never guess which way it went. The queue's
        // live update shows whether the agencies have it.
        showToast(t("common.noAnswer"), "danger");
        return;
      }
      if (result.success) {
        const count = result.agencyCount ?? 0;
        showToast(t("routing.routedToast", { id: reportId, agencies: agencyCount(count, t) }), "success");
      } else {
        showToast(result.message ?? t("routing.failed"), "danger");
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
