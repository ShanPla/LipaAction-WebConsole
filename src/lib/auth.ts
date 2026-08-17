import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Keep in sync with the app_role enum in supabase/migrations. Only these three
// roles belong on the Barangay Web Console — agency_user, agency_supervisor,
// municipal_admin, dpo, and resident all belong on other surfaces, not this one.
const BARANGAY_ROLES = ["barangay_official", "barangay_admin", "senior_barangay_admin"] as const;

export type BarangayRole = (typeof BARANGAY_ROLES)[number];

export interface OfficialProfile {
  id: string;
  fullName: string | null;
  role: BarangayRole;
  barangayId: string;
  barangayName: string;
}

/**
 * Call this at the top of every gated page's Server Component. Redirects to
 * /login if there's no session, or to /not-authorized if the signed-in user's
 * role isn't one of the barangay roles this console is for. Returns the
 * profile otherwise, so the page can use the official's real identity.
 */
export async function requireBarangayOfficial(): Promise<OfficialProfile> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, barangay_id, barangays ( name )")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Auth succeeded but no profiles row exists yet (shouldn't normally happen —
    // handle_new_user should have created one). Treat as not-authorized rather
    // than crashing the page.
    redirect("/not-authorized");
  }

  if (!isBarangayRole(profile.role) || !profile.barangay_id) {
    redirect("/not-authorized");
  }

  // Supabase's join comes back as an array even for a to-one relationship
  // unless the FK is marked unique — normalize it to a single value here so
  // every caller downstream just gets a plain string.
  const barangayName = Array.isArray(profile.barangays)
    ? profile.barangays[0]?.name
    : (profile.barangays as { name: string } | null)?.name;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    barangayId: profile.barangay_id,
    barangayName: barangayName ?? "Unknown barangay",
  };
}

function isBarangayRole(role: string): role is BarangayRole {
  return (BARANGAY_ROLES as readonly string[]).includes(role);
}