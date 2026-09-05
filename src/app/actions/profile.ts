"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpdateResult {
  success: boolean;
  message?: string;
}

const MAX_NAME_LENGTH = 80;

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
 */
export async function updateDisplayName(fullName: string): Promise<UpdateResult> {
  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return { success: false, message: "Display name can't be empty." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { success: false, message: `Keep it under ${MAX_NAME_LENGTH} characters.` };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Your session expired. Sign in again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", user.id);

  if (error) {
    // 42501: RLS refused the write — shouldn't happen for one's own row, but
    // surfaced distinctly so it isn't misread as a transient failure.
    if (error.code === "42501") {
      return { success: false, message: "Not permitted to change this profile." };
    }
    return { success: false, message: "Something went wrong. Try again." };
  }

  // The name renders in the sidebar and top bar on every page, not just
  // Settings — revalidate the whole layout so it doesn't go stale elsewhere.
  revalidatePath("/", "layout");
  return { success: true };
}
