"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { resolveAtBarangay } from "@/app/actions/reports";
import { callAction } from "@/lib/callAction";
import { useT } from "@/lib/i18n";

/**
 * The resolve-at-barangay flow, shared by the queue row and the detail
 * drawer for the same reason the review and routing hooks are shared: two
 * entry points must not drift on the note requirement or on how a failure
 * is reported.
 *
 * No local [resolved] mark is kept. resolveAtBarangay revalidates /queue,
 * and a report closed this way leaves every queue tab (it has no agency
 * row, which is how the routed list is found), so the toast says where it
 * went. onDone lets the drawer close itself: the copy it holds would
 * otherwise still offer the buttons.
 */
export function useBarangayResolve(reportId: string, onDone?: () => void) {
  const { showToast } = useToast();
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [isPrompting, setIsPrompting] = useState(false);

  function resolve(note: string) {
    startTransition(async () => {
      const result = await callAction(() => resolveAtBarangay(reportId, note));
      setIsPrompting(false);
      if (result === null) {
        // It can't be undone, so never guess which way it went.
        showToast(t("common.noAnswer"), "danger");
        return;
      }
      if (result.success) {
        showToast(t("resolve.doneToast", { id: reportId }), "success");
        onDone?.();
      } else {
        showToast(result.message ?? t("resolve.failed"), "danger");
      }
    });
  }

  return {
    isPending,
    isPrompting,
    openPrompt: () => setIsPrompting(true),
    cancelPrompt: () => setIsPrompting(false),
    resolve,
  };
}
