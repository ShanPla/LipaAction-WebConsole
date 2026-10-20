"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import {
  loadResidentLink,
  residentProfilePath,
  runManualSanction,
  type SanctionResult,
} from "@/lib/residentProfile";

/*
 * Resident profile and manual sanctions. Both actions run under the signed-in
 * official's own session; no service-role key. The database decides who may do
 * what (desk officer: refused; barangay_admin: inaccurate track only), so a
 * forged call from another account writes nothing. Public POST endpoints like
 * every Server Action: input is proven before any call, and the answer is a
 * code, never a database message.
 */

/** The report drawer's "View resident profile" link: a path, or null (no link). */
export async function findResidentLink(reportId: string): Promise<string | null> {
  if (!isUuid(reportId)) return null;
  return loadResidentLink(createClient(), reportId);
}

/**
 * Applies one manual sanction. `reportIds` is the evidence in the order the
 * official ticked it: the first is the primary, the rest go in
 * p_more_report_ids (one strike, one audit row, one notification).
 */
export async function applyManualSanction(raw: {
  residentId?: unknown;
  reportIds?: unknown;
  track?: unknown;
  reason?: unknown;
}): Promise<SanctionResult> {
  const result = await runManualSanction(createClient(), raw);
  if (result.ok && isUuid(raw?.residentId)) revalidatePath(residentProfilePath(raw.residentId));
  return result;
}
