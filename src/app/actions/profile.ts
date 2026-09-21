"use server";

import { revalidatePath } from "next/cache";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { MAX_NAME_LENGTH, sanitizeName } from "@/lib/utils";

interface UpdateResult {
  success: boolean;
  message?: string;
}

/**
 * Writes the signed-in official's own profiles.full_name.
 *
 * This is the one profile field an official can actually change: the
 * profiles_update_own policy allows UPDATE where id = auth.uid(), while role
 * and barangay_id are blocked at the grant layer (self-promotion). Email and
 * phone are NOT handled here — those live in auth.users and need real
 * Supabase auth flows with confirmation, not a profiles write.
 *
 * RLS is the actual boundary; the .eq() below is belt-and-suspenders, and
 * user.id is read server-side from the session rather than accepted from the
 * caller, so a client can't aim this at someone else's row.
 *
 * The name is an identity, not decoration: it's the [Validating official] on
 * every decision in Validation History and in the exported CSV. So it's
 * sanitised before it's stored — see sanitizeName() — and a name that
 * sanitises to nothing is refused rather than stored blank.
 */
export async function updateDisplayName(fullName: string): Promise<UpdateResult> {
  // typeof first: this is a public endpoint, and `.trim()` on a number or an
  // object would throw inside the action instead of answering.
  if (typeof fullName !== "string") {
    return { success: false, message: "That name wasn't valid. Try again." };
  }

  const cleaned = sanitizeName(fullName);

  if (cleaned.length === 0) {
    return { success: false, message: "Display name can't be empty." };
  }
  if (cleaned.length > MAX_NAME_LENGTH) {
    return { success: false, message: `Keep it under ${MAX_NAME_LENGTH} characters.` };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    // An Auth outage is not an expired session; saying so sends the official
    // to sign in again for nothing.
    return {
      success: false,
      message:
        userError && isAuthRetryableFetchError(userError)
          ? "Couldn't reach the server. Check your connection, then try again."
          : "Your session expired. Sign in again.",
    };
  }

  // .select("id") so the answer says how many rows changed. Without it
  // PostgREST replies 204 whether one row or none was written — and RLS
  // filters an UPDATE silently, with no error — so a refused write used to
  // show [Display name updated].
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ full_name: cleaned })
    .eq("id", user.id)
    .select("id");

  if (error) {
    // 42501: a grant or WITH CHECK refusal — surfaced distinctly so it isn't
    // misread as a transient failure.
    if (error.code === "42501") {
      return { success: false, message: "Not permitted to change this profile." };
    }
    console.error("[updateDisplayName] failed", error.code, error.message);
    return { success: false, message: "Something went wrong. Try again." };
  }

  if (!updated || updated.length !== 1) {
    return { success: false, message: "Your name wasn't saved. Refresh the page and try again." };
  }

  // The name renders in the sidebar and top bar on every page, not just
  // Settings — revalidate the whole layout so it doesn't go stale elsewhere.
  revalidatePath("/", "layout");
  return { success: true };
}
