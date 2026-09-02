"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpdateResult {
  success: boolean;
  message?: string;
}

/**
 * THE CUTOVER — review_report() is now the ONLY path to validate/reject a
 * report. As of the 2026-08-31 db push, prod's incident_reports_review_
 * stamped CHECK constraint means a raw update({ status: 'validated' |
 * 'rejected' }) fails with 23514 — there is no fallback, and none should
 * be added back. Same function name/signature as before this swap
 * (updateReportStatus(reportId, status, reason)), so ReportRow.tsx and the
 * ReasonPromptModal flow needed ZERO changes for this cutover — only this
 * function's internals changed.
 *
 * RLS scopes what review_report() is allowed to do (own-barangay for
 * barangay roles, city-wide for municipal_admin) — this function doesn't
 * re-check that itself.
 */
export async function updateReportStatus(
  reportId: string,
  status: "validated" | "rejected",
  reason?: string
): Promise<UpdateResult> {
  const supabase = createClient();

  if (status === "rejected" && (!reason || reason.trim() === "")) {
    return { success: false, message: "A reason is required to reject a report." };
  }

  const { error } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_decision: status,
    p_reason: reason ?? null,
  });

  if (error) {
    // 22023: bad decision value, or missing/empty reason on reject (the RPC
    // enforces this server-side too, not just our client-side check above).
    if (error.code === "22023") {
      return { success: false, message: error.message };
    }
    // 42501: not authorized — wrong role, wrong barangay, report not found,
    // or it already left the pending_priority/prioritized window.
    if (error.code === "42501") {
      return { success: false, message: "Not permitted — wrong barangay, or already past review." };
    }
    // 55000: terminal-state conflict — someone else reviewed this report
    // between when the queue loaded and when this action fired.
    if (error.code === "55000") {
      return { success: false, message: "Someone else already reviewed this report." };
    }
    return { success: false, message: "Something went wrong. Try again." };
  }

  revalidatePath("/queue");
  return { success: true };
}