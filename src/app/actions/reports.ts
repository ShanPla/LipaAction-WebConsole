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
    return { success: false, message: messageForReviewError(error) };
  }

  revalidatePath("/queue");
  return { success: true };
}

/**
 * Maps review_report()'s SQLSTATEs to something an official can act on.
 * Extracted so the bulk path below reports failures identically to the
 * single-report path — behaviour is unchanged from when this lived inline.
 */
function messageForReviewError(error: { code?: string; message: string }): string {
  // 22023: bad decision value, or missing/empty reason on reject (the RPC
  // enforces this server-side too, not just our client-side check above).
  if (error.code === "22023") return error.message;
  // 42501: not authorized — wrong role, wrong barangay, report not found,
  // or it already left the pending_priority/prioritized window.
  if (error.code === "42501") {
    return "Not permitted — wrong barangay, or already past review.";
  }
  // 55000: terminal-state conflict — someone else reviewed this report
  // between when the queue loaded and when this action fired.
  if (error.code === "55000") return "Someone else already reviewed this report.";
  return "Something went wrong. Try again.";
}

export interface BulkValidateResult {
  validated: number;
  failures: { reportId: string; message: string }[];
}

/**
 * Validates every report in a duplicate cluster, one review_report() call per
 * member.
 *
 * There is no bulk RPC and no transaction spanning the set, so this is not
 * all-or-nothing: some members can succeed while others fail, most often with
 * 55000 because another official reviewed one of them first. The caller gets
 * both counts and must say so — reporting a partial run as success is exactly
 * the failure this button had before it did any work at all.
 *
 * Sequential rather than Promise.all: these are writes against the same
 * cluster, and a failure part-way through shouldn't leave the rest in flight.
 */
export async function validateReports(reportIds: string[]): Promise<BulkValidateResult> {
  const supabase = createClient();
  const failures: BulkValidateResult["failures"] = [];
  let validated = 0;

  for (const reportId of reportIds) {
    const { error } = await supabase.rpc("review_report", {
      p_report_id: reportId,
      p_decision: "validated",
      p_reason: null,
    });

    if (error) {
      failures.push({ reportId, message: messageForReviewError(error) });
    } else {
      validated += 1;
    }
  }

  if (validated > 0) revalidatePath("/queue");
  return { validated, failures };
}