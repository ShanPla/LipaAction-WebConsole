"use server";

import { revalidatePath } from "next/cache";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getResidents, type ResidentsData } from "@/lib/data/residents";
import { isBarangayAdminRole } from "@/lib/roles";
import { isUuid } from "@/lib/utils";
import { isAttestMethod, MAX_REVOKE_REASON_LENGTH } from "@/lib/residents";
import { failedWriteOutcome, type WriteOutcome } from "@/lib/writeOutcome";

/*
 * Tier 1 verification (thesis A.3.9): attest that a resident lives in the
 * barangay, or revoke that attestation.
 *
 * Both go through the backend's own functions, which decide everything that
 * matters: which roles may call them, that the resident belongs to the
 * caller's barangay, and what the resident's tier becomes. Nothing here
 * writes a table, and neither function changes a resident's trust score.
 *
 * Like every Server Action these are public POST endpoints, so each proves
 * the shape of its input before any call, and answers with a code rather
 * than the backend's text (see WriteOutcome).
 */

const VERIFY_PATH = "/verify-resident";

export type ResidentSearchResult =
  | { ok: true; data: ResidentsData }
  | { ok: false; outcome: Extract<WriteOutcome, "session-expired" | "unreachable" | "refused" | "failed"> };

/**
 * The Verify Resident list, narrowed by a search.
 *
 * An action rather than a page parameter because of what a search is: a
 * resident's name or phone number. In the address it would stay in the desk
 * PC's history and in the host's request log; in a POST body it does neither.
 *
 * It is a public endpoint like any action, so it runs the page's own gate
 * again rather than trust that the page was open: the caller's role and
 * barangay are read from their profile, never taken from the request. It
 * answers with a code instead of redirecting, since the caller is a page
 * that is already on screen.
 */
export async function findResidents(query: string, tier: string): Promise<ResidentSearchResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) {
    // An Auth outage is not an expired session.
    return { ok: false, outcome: userError && isAuthRetryableFetchError(userError) ? "unreachable" : "session-expired" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, barangay_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[findResidents] profile read failed", error.code, error.message);
    return { ok: false, outcome: "failed" };
  }
  const own = profile as { role: string; barangay_id: string | null } | null;
  if (!own || !isBarangayAdminRole(own.role) || !own.barangay_id) return { ok: false, outcome: "refused" };

  // The loader cleans the search and proves the tier, whatever was sent.
  const data = await getResidents(own.barangay_id, query, tier);
  // A search that couldn't be read is a failed search. Handing back its
  // empty list would replace the list on screen with [no resident matches].
  if (data.loadFailed) return { ok: false, outcome: "failed" };
  return { ok: true, data };
}

/**
 * Promotes a resident of the caller's barangay from Tier 0 to Tier 1.
 * Callers: barangay_admin and senior_barangay_admin, enforced by the
 * function. There is no free-text field, by the backend's design: what is
 * recorded is who attested, how, and when, and nothing of the evidence shown.
 */
export async function attestResident(residentId: string, method: string): Promise<WriteOutcome> {
  if (!isUuid(residentId) || !isAttestMethod(method)) return "invalid";

  const supabase = createClient();
  const { error, status } = await supabase.rpc("attest_resident", {
    p_resident_id: residentId,
    p_method: method,
  });

  if (!error) {
    revalidatePath(VERIFY_PATH);
    return "done";
  }

  // 22023 here can only mean the account isn't a resident: the method was
  // proven above.
  const outcome = failedWriteOutcome("attest_resident", residentId, status, error, "not-eligible");
  // Already Tier 1: bring the list up to date with the answer.
  if (outcome === "stale") revalidatePath(VERIFY_PATH);
  return outcome;
}

/**
 * Revokes a resident's active attestation, returning them to Tier 0, with a
 * reason the backend records. Callers: senior_barangay_admin only, enforced
 * by the function.
 */
export async function revokeAttestation(residentId: string, reason: string): Promise<WriteOutcome> {
  // typeof first: a caller can send a number or an object, and `.trim()` on
  // either would throw inside the action instead of answering.
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!isUuid(residentId) || trimmed.length === 0 || trimmed.length > MAX_REVOKE_REASON_LENGTH) {
    return "invalid";
  }

  const supabase = createClient();
  const { error, status } = await supabase.rpc("revoke_resident_attestation", {
    p_resident_id: residentId,
    p_reason: trimmed,
  });

  if (!error) {
    revalidatePath(VERIFY_PATH);
    return "done";
  }

  const outcome = failedWriteOutcome("revoke_resident_attestation", residentId, status, error, "invalid");
  // No active attestation any more: bring the list up to date.
  if (outcome === "stale") revalidatePath(VERIFY_PATH);
  return outcome;
}
