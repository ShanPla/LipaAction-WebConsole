"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { MAX_LIFT_REASON_LENGTH } from "@/lib/sanctions";
import { failedWriteOutcome, type WriteOutcome } from "@/lib/writeOutcome";

/**
 * Lifts a resident's active cooldown or suspension (thesis A.3.4), with a
 * reason the backend records.
 *
 * Everything that matters is decided by the backend's function: that the
 * caller is a barangay admin of the resident's own barangay, that anything
 * on the malicious track needs a senior barangay admin, and what a lift
 * changes (the trust score back to 0.5, the cooldown and suspension cleared,
 * a history row). It never changes the resident's tier. Nothing here writes
 * a table.
 *
 * A public POST endpoint like every Server Action, so the input is proven
 * before any call, and the answer is a code (see WriteOutcome).
 */
export async function liftSanction(residentId: string, reason: string): Promise<WriteOutcome> {
  // typeof first: a caller can send a number or an object, and `.trim()` on
  // either would throw inside the action instead of answering.
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!isUuid(residentId) || trimmed.length === 0 || trimmed.length > MAX_LIFT_REASON_LENGTH) {
    return "invalid";
  }

  const supabase = createClient();
  const { error, status } = await supabase.rpc("lift_resident_sanction", {
    p_resident_id: residentId,
    p_reason: trimmed,
  });

  if (!error) {
    refresh();
    return "done";
  }

  const outcome = failedWriteOutcome("lift_resident_sanction", residentId, status, error, "invalid");
  // No active sanction any more (lifted by someone else, or a cooldown that
  // ran out): bring the list up to date with the answer.
  if (outcome === "stale") refresh();
  return outcome;
}

// The list itself, and the admin home's sanction cards.
function refresh() {
  revalidatePath("/sanctions");
  revalidatePath("/queue");
}
