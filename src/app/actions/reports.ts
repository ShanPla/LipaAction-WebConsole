"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpdateResult {
  success: boolean;
  message?: string;
}

/**
 * Real Validate/Reject action. RLS's ir_update_barangay policy is what
 * actually authorizes this — a barangay_official/admin can only update
 * incident_reports rows in their own barangay. This function doesn't
 * re-check that itself; if the update is disallowed, Supabase just returns
 * zero rows affected (not a thrown error), which is surfaced below.
 *
 * `reason` is accepted but NOT YET PERSISTED — the review_reason column and
 * the review_report() RPC that actually stamps it don't exist on production
 * yet (PR #12, pending). Captured here now so the UI (the Reject reason
 * prompt) is cutover-ready: when review_report() goes live, only this
 * function's internals change — ReportRow.tsx and its reason prompt don't
 * need to change at all.
 */
export async function updateReportStatus(
  reportId: string,
  status: "validated" | "rejected",
  reason?: string
): Promise<UpdateResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not signed in." };
  }

  if (status === "rejected" && (!reason || reason.trim() === "")) {
    return { success: false, message: "A reason is required to reject a report." };
  }

  // Only set validated_by for the validated case — this column specifically
  // tracks who validated a report. reason is intentionally NOT written
  // anywhere yet (see doc comment above) — TODO once review_report() lands:
  // swap this whole function body for a supabase.rpc('review_report', ...)
  // call, which will persist reason into the new review_reason column.
  const update: { status: string; validated_by?: string } = { status };
  if (status === "validated") {
    update.validated_by = user.id;
  }

  const { data, error } = await supabase
    .from("incident_reports")
    .update(update)
    .eq("id", reportId)
    .select("id");

  if (error) {
    return { success: false, message: error.message };
  }

  if (!data || data.length === 0) {
    // RLS silently blocked the update (wrong barangay, wrong role, etc.) —
    // no Postgres error is thrown for this, so it has to be checked here.
    return { success: false, message: "Not permitted to update this report." };
  }

  revalidatePath("/queue");
  return { success: true };
}