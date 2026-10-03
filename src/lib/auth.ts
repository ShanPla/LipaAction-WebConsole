import "server-only";
import { redirect } from "next/navigation";
import { isAuthRetryableFetchError, type Factor } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { CITY_ROLES } from "@/lib/roles";
import { verifiedAuthenticator } from "@/lib/twoStep";
import { manilaDate } from "@/lib/utils";

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
// The list itself lives in roles.ts, where client code can read it too.

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
  // The day this account set up its authenticator app, for its Settings
  // page. Null before set-up; every city page but the set-up page itself
  // requires it, so in practice it is always set where it is shown.
  twoStepSince?: string | null;
}

/** A city account's sign-in, before or after its second step. */
export interface CitySignIn {
  admin: CityProfile;
  // True once this session has passed the authenticator-app step.
  secondStepDone: boolean;
  // True when the account has an authenticator app set up, so the step is a
  // code to enter rather than a set-up to do.
  hasAuthenticator: boolean;
}

// Where a city session that hasn't passed its second step is sent.
const TWO_STEP_PATH = "/city/two-step";

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
async function readSignedInProfile(): Promise<{
  email: string | null;
  profile: ProfileRow;
  // What the city gate needs to read the second step from: the request's
  // client, and the sign-in factors the Auth server reported for this user.
  supabase: ReturnType<typeof createClient>;
  factors: Factor[];
}> {
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

  return { email: user.email ?? null, profile: profile as ProfileRow, supabase, factors: user.factors ?? [] };
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

export type BarangayAdminRole = Exclude<BarangayRole, "barangay_official">;
export type BarangayAdminProfile = OfficialProfile & { role: BarangayAdminRole };

/**
 * The gate for the admin-only barangay pages (Verify Resident, Sanctions).
 * The thesis gives Tier 1 verification and sanction lifts to barangay_admin
 * and senior_barangay_admin, and no such control to a barangay_official
 * (A.3.1), so that role is sent back to its queue: it has a console, just
 * not these pages. The database enforces the same split on every write; this
 * only keeps the pages off the screen.
 */
export async function requireBarangayAdmin(): Promise<BarangayAdminProfile> {
  const official = await requireBarangayOfficial();
  if (official.role === "barangay_official") redirect("/queue");
  return { ...official, role: official.role };
}

/**
 * The gate for /city. A barangay official is sent back to their queue rather
 * than told they have no access, since they do have a console; every other
 * role goes to /not-authorized.
 *
 * A city account then needs its second step (thesis A.5.1): the emailed code
 * signs it in, and a code from an authenticator app makes the session one
 * this gate accepts. The role reads every barangay's reports and the trail
 * of who opened them, so a stolen mailbox alone must not open it. Until the
 * step is passed, the one city page a session gets is the page that asks for
 * it. Barangay sign-in is unchanged.
 *
 * This keeps the pages off the screen. It does not stop the same session
 * from reading through the database's API, which only the database can
 * refuse; the backend adds that rule on its side.
 */
export async function requireCityAdmin(): Promise<CityProfile> {
  const { admin, secondStepDone } = await requireCitySignIn();
  if (!secondStepDone) redirect(TWO_STEP_PATH);
  return admin;
}

/**
 * A signed-in city account, whether or not it has passed its second step.
 * For the two-step page alone: every other city page uses requireCityAdmin().
 */
export async function requireCitySignIn(): Promise<CitySignIn> {
  const { email, profile, supabase, factors } = await readSignedInProfile();

  if (isBarangayRole(profile.role)) redirect("/queue");
  if (!isCityRole(profile.role)) redirect("/not-authorized");

  const authenticator = verifiedAuthenticator(factors);
  return {
    admin: {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      email,
      // The day the factor was created. Not updated_at: the Auth server
      // rewrites that on every code attempt, so it would show the last sign-in.
      twoStepSince: authenticator ? manilaDate(authenticator.created_at) : null,
    },
    secondStepDone: (await sessionAssuranceLevel(supabase)) === "aal2",
    hasAuthenticator: authenticator !== null,
  };
}

/**
 * The session's assurance level: aal1 after the emailed code, aal2 once an
 * authenticator code has been verified in it.
 *
 * Read from the access token's own claim, as the library's own helper reads
 * it. No signature check is needed here, and none is made:
 * readSignedInProfile() has just had the Auth server vouch for this same
 * token (getUser), so its claims are the server's, not the browser's. That
 * holds only in this order, which is why the function stays private to the
 * gate.
 */
async function sessionAssuranceLevel(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const payload = JSON.parse(Buffer.from(session.access_token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    // An unreadable token is not a passed second step.
    return null;
  }
}

function isBarangayRole(role: string): role is BarangayRole {
  return (BARANGAY_ROLES as readonly string[]).includes(role);
}

function isCityRole(role: string): role is CityRole {
  return (CITY_ROLES as readonly string[]).includes(role);
}