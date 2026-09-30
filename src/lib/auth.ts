import "server-only";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Keep in sync with the app_role enum in supabase/migrations. Only these three
// roles belong on the barangay pages — agency_user, agency_supervisor, dpo,
// and resident all belong on other surfaces, and municipal_admin has its own
// gate below.
const BARANGAY_ROLES = ["barangay_official", "barangay_admin", "senior_barangay_admin"] as const;

// The city dashboard (/city). Kept apart from BARANGAY_ROLES on purpose:
// every barangay page filters by the official's barangay_id and carries
// decision buttons, and RLS lets municipal_admin write city-wide, so one list
// admitting both would hand that power to every desk page. dpo is the paper's
// read-only twin of this role (A.5) and would join this list, not the other.
const CITY_ROLES = ["municipal_admin"] as const;

export type BarangayRole = (typeof BARANGAY_ROLES)[number];
export type CityRole = (typeof CITY_ROLES)[number];
export type ConsoleRole = BarangayRole | CityRole;

export interface OfficialProfile {
  id: string;
  fullName: string | null;
  role: BarangayRole;
  barangayId: string;
  barangayName: string;
  email: string | null;
  phone: string | null;
}

// A city account has no barangay, so it carries none of the barangay fields.
// The shell tells the two apart by `barangayName`.
export interface CityProfile {
  id: string;
  fullName: string | null;
  role: CityRole;
  email: string | null;
}

export type ConsoleUser = OfficialProfile | CityProfile;

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string;
  barangay_id: string | null;
  phone: string | null;
  barangays: { name: string } | { name: string }[] | null;
}

/**
 * The signed-in user and their profiles row, shared by both gates. Redirects
 * to /login when there is no session and to /not-authorized when there is no
 * row; throws on an outage, which the route's error.tsx turns into a retry.
 */
async function readSignedInProfile(): Promise<{ email: string | null; profile: ProfileRow }> {
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

  return { email: user.email ?? null, profile: profile as ProfileRow };
}

export async function requireBarangayOfficial(): Promise<OfficialProfile> {
  const { email, profile } = await readSignedInProfile();

  // Every sign-in lands on /queue, so this is also how a city account finds
  // its own dashboard.
  if (isCityRole(profile.role)) redirect("/city");

  if (!isBarangayRole(profile.role) || !profile.barangay_id) {
    redirect("/not-authorized");
  }

  // Supabase's join comes back as an array even for a to-one relationship
  // unless the FK is marked unique — normalize it to a single value here so
  // every caller downstream just gets a plain string.
  const barangayName = Array.isArray(profile.barangays)
    ? profile.barangays[0]?.name
    : profile.barangays?.name;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    barangayId: profile.barangay_id,
    barangayName: barangayName ?? "Unknown barangay",
    // email comes from the already-fetched auth session — no extra query
    // needed. profile.phone is a real, already-fetchable column.
    email,
    phone: profile.phone,
  };
}

/**
 * The gate for /city. A barangay official is sent back to their queue rather
 * than told they have no access, since they do have a console; every other
 * role goes to /not-authorized.
 */
export async function requireCityAdmin(): Promise<CityProfile> {
  const { email, profile } = await readSignedInProfile();

  if (isBarangayRole(profile.role)) redirect("/queue");
  if (!isCityRole(profile.role)) redirect("/not-authorized");

  return { id: profile.id, fullName: profile.full_name, role: profile.role, email };
}

function isBarangayRole(role: string): role is BarangayRole {
  return (BARANGAY_ROLES as readonly string[]).includes(role);
}

function isCityRole(role: string): role is CityRole {
  return (CITY_ROLES as readonly string[]).includes(role);
}