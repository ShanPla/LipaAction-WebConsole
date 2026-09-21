import "server-only";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
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
  email: string | null;
  phone: string | null;
}

export async function requireBarangayOfficial(): Promise<OfficialProfile> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    // Only a verdict from Auth itself means [signed out]. A network failure,
    // a timeout, or an Auth 5xx arrives as AuthRetryableFetchError, and
    // redirecting on that would sign an official out of an emergency console
    // every time the connection hiccuped — and a background router.refresh()
    // re-runs this gate, so it would happen mid-shift with no click. Throwing
    // hands it to the route's error.tsx instead, which offers a retry.
    if (userError && isAuthRetryableFetchError(userError)) {
      throw new Error("Couldn't reach the sign-in service");
    }
    redirect("/login");
  }

  // maybeSingle, not single: `.single()` reports [no row] and [the query
  // failed] through the same error field, and the old `error || !profile`
  // test sent a PostgREST outage, a timeout, or an RLS change to
  // /not-authorized — telling a working official they had no access.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, barangay_id, phone, barangays ( name )")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] profile read failed", error.code, error.message);
    throw new Error("Couldn't load your profile");
  }

  if (!profile) {
    // Auth succeeded but no profiles row exists (shouldn't normally happen —
    // handle_new_user should have created one). That genuinely is
    // [not authorized], not an outage.
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
    // user.email comes from the already-fetched auth session — no extra
    // query needed. profile.phone is a real, already-fetchable column.
    email: user.email ?? null,
    phone: profile.phone,
  };
}

function isBarangayRole(role: string): role is BarangayRole {
  return (BARANGAY_ROLES as readonly string[]).includes(role);
}