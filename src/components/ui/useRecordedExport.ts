"use client";

import { useCallback, useState } from "react";
import { recordExport } from "@/app/actions/audit";
import { useToast } from "@/components/ui/Toast";
import { callAction } from "@/lib/callAction";
import { useT, type MessageKey } from "@/lib/i18n";
import type { ExportKind, ExportRecordOutcome } from "@/lib/exports";

const REFUSALS: Record<Exclude<ExportRecordOutcome, "recorded">, MessageKey> = {
  invalid: "export.failed",
  failed: "export.failed",
  refused: "export.refused",
  "session-expired": "export.sessionExpired",
  unreachable: "export.unreachable",
};

// Next drops an action that is queued behind a navigation without ever
// settling its promise. Past this long, the record counts as unanswered,
// so the button comes back instead of staying on [Working…] for good.
const RECORD_TIMEOUT_MS = 20_000;

/**
 * For a button that exports names or the trail itself: records the export in
 * the access trail first, and tells the caller whether it may go ahead.
 *
 * `record()` resolves to true only once the record is written. Otherwise it
 * has already said why in a toast, in words that include that nothing was
 * downloaded or printed, and the caller simply stops. No answer at all is
 * treated the same way: the record may or may not exist, and the export
 * still doesn't happen.
 */
export function useRecordedExport() {
  const { showToast } = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);

  const record = useCallback(
    async (what: ExportKind, rows: number, form: "file" | "print" = "file"): Promise<boolean> => {
      setBusy(true);
      const outcome = await Promise.race([
        callAction(() => recordExport(what, rows)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), RECORD_TIMEOUT_MS)),
      ]);
      setBusy(false);
      if (outcome === "recorded") return true;
      const nothing = t(form === "print" ? "export.nothing.print" : "export.nothing.file");
      showToast(t(outcome === null ? "export.noAnswer" : REFUSALS[outcome], { nothing }), "danger");
      return false;
    },
    [showToast, t]
  );

  return { record, busy };
}
