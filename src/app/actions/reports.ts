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
 */
export async function updateReportStatus(
  reportId: string,
  status: "validated" | "rejected"
): Promise<UpdateResult> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("incident_reports")
    .update({ status })
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