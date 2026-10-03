import "server-only";
import { createClient } from "@/lib/supabase/server";
import { manilaDate, sanitizeName } from "@/lib/utils";
import { RESIDENT_TIER_FILTERS, type ResidentTierFilter } from "@/lib/residents";

interface RawResident {
  id: string;
  full_name: string | null;
  phone: string | null;
  trust_tier: string | null;
  created_at: string | null;
}

interface RawVerification {
  resident_id: string;
  attested_by: string | null;
  attested_role: string | null;
  method: string | null;
  verified_at: string | null;
  revoked_at: string | null;
  revoked_role: string | null;
  revoke_reason: string | null;
}

/** The attestation a Tier 1 resident stands on. */
export interface ResidentVerification {
  // The backend's own value (in_person, field, bulk_import); the page labels
  // the ones it knows and shows any other as itself.
  method: string;
  verifiedOn: string;
  // The official who attested, by name, as Validation History names the
  // official behind a decision. Null when the name couldn't be read.
  attestedBy: string | null;
  attestedRole: string | null;
}

/** The most recent revoked attestation, so a re-verification isn't made blind. */
export interface ResidentRevocation {
  revokedOn: string;
  reason: string | null;
  revokedRole: string | null;
}

export interface ResidentRow {
  id: string;
  // Sanitised like an official's name. Null when the profile has no usable
  // name, which the page says rather than showing a blank.
  name: string | null;
  // The last four digits only. The full number never leaves the server: the
  // ending is enough to tell two residents with one name apart.
  phoneEnding: string | null;
  // profiles.trust_tier as stored: tier0 (phone-verified) or tier1
  // (barangay-attested). Any other value is shown as itself, with no action.
  tier: string;
  registeredOn: string | null;
  verification: ResidentVerification | null;
  lastRevocation: ResidentRevocation | null;
}

export interface ResidentsData {
  residents: ResidentRow[];
  // What the list was narrowed by, after cleaning, so the page can show it.
  query: string;
  tier: ResidentTierFilter;
  limit: number;
  // True when more residents match than the page loads.
  capped: boolean;
  // True when the residents query failed and the empty list is a fallback.
  loadFailed: boolean;
  // True when the attestation rows couldn't be read: tiers still show, their
  // details don't.
  verificationsUnavailable: boolean;
}

const RESIDENT_LIMIT = 100;
const MAX_QUERY_LENGTH = 60;

/** One of the three tier filters; anything else is the default, Tier 0. */
export function resolveTierFilter(value: unknown): ResidentTierFilter {
  // Array includes, not an object lookup, so [toString] is not a filter.
  return typeof value === "string" && (RESIDENT_TIER_FILTERS as readonly string[]).includes(value)
    ? (value as ResidentTierFilter)
    : "tier0";
}

/**
 * A search reduced to what a name or a phone number can contain. The pattern
 * characters of LIKE (%, _, and PostgREST's *) and the backslash are dropped
 * with every other symbol, so the text is only ever matched literally.
 */
export function cleanResidentQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeName(value)
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

// A phone search is exactly the four digits the page shows, or a whole
// number. Anything between would let the ending on screen be extended a
// digit at a time: search 04567 to 94567, and the one that still finds the
// resident gives away the fifth digit.
const PHONE_ENDING_DIGITS = 4;
const FULL_NUMBER_DIGITS = 10;

/**
 * The digits to match the end of a phone number against, when a search is a
 * phone number rather than a name: nothing but digits and separators, and
 * either the last four digits or a whole number. A leading 0 (0917…) or 63
 * (+63 917…) is dropped, so either way of saying a Philippine mobile number
 * finds the stored one. Null means the search is read as a name.
 */
export function phoneSearchDigits(query: string): string | null {
  if (!/^[\d .-]+$/.test(query)) return null;
  let digits = query.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("63")) digits = digits.slice(2);
  else if (digits.length >= 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === PHONE_ENDING_DIGITS || digits.length >= FULL_NUMBER_DIGITS ? digits : null;
}

/**
 * The residents of one barangay, for Tier 1 verification (thesis A.3.9).
 *
 * This is the one barangay page that names residents: an official cannot
 * attest that a person lives in the barangay without knowing who the person
 * is. It reads the resident's profile and attestations and nothing of what
 * they reported, so no report can be tied to a name through it.
 *
 * The thesis's page lists residents who asked for verification. No request
 * is recorded anywhere, so the list is the barangay's residents by tier,
 * with a search by name or by phone number. The second matters: a resident's
 * profile can carry no name at all (the first one seen on live data had
 * none), and the number they signed up with is then the only way to find
 * the person at the desk.
 *
 * Row-level security scopes profiles and verifications to the official's own
 * barangay; the filters below repeat that, as every loader's do.
 */
export async function getResidents(
  barangayId: string,
  rawQuery: unknown,
  rawTier: unknown
): Promise<ResidentsData> {
  const query = cleanResidentQuery(rawQuery);
  const tier = resolveTierFilter(rawTier);
  const supabase = createClient();

  let residentsQuery = supabase
    .from("profiles")
    .select("id, full_name, phone, trust_tier, created_at")
    // profiles holds officials too; only residents are verified.
    .eq("role", "resident")
    .eq("barangay_id", barangayId);
  if (tier !== "all") residentsQuery = residentsQuery.eq("trust_tier", tier);
  const phoneDigits = phoneSearchDigits(query);
  if (phoneDigits !== null) {
    // The end of the number, so the country code's form doesn't matter.
    residentsQuery = residentsQuery.ilike("phone", `%${phoneDigits}`);
  } else if (query.length > 0) {
    residentsQuery = residentsQuery.ilike("full_name", `%${query}%`);
  }

  const { data, error } = await residentsQuery
    .order("full_name", { ascending: true, nullsFirst: false })
    // Residents without a name come last, newest account first; the id
    // settles any tie left, so the order never shifts between loads.
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    // One more than is shown: the only way to know more exist.
    .limit(RESIDENT_LIMIT + 1);

  if (error || !data) {
    console.error("[residents] load failed", error?.code, error?.message);
    return {
      residents: [],
      query,
      tier,
      limit: RESIDENT_LIMIT,
      capped: false,
      loadFailed: true,
      verificationsUnavailable: false,
    };
  }

  const rows = (data as RawResident[]).slice(0, RESIDENT_LIMIT);
  const capped = data.length > RESIDENT_LIMIT;
  const ids = rows.map((r) => r.id);

  const verificationsRes =
    ids.length > 0
      ? await supabase
          .from("verifications")
          .select("resident_id, attested_by, attested_role, method, verified_at, revoked_at, revoked_role, revoke_reason")
          .in("resident_id", ids)
      : { data: [] as RawVerification[], error: null };

  const verificationsUnavailable = Boolean(verificationsRes.error);
  if (verificationsRes.error) {
    console.error("[residents] verifications failed", verificationsRes.error.code, verificationsRes.error.message);
  }
  const verifications = (verificationsRes.data ?? []) as RawVerification[];

  // The attesting officials' names, as Validation History resolves reviewers:
  // verifications has no link to profiles that PostgREST can embed.
  const attesterIds = [
    ...new Set(
      verifications
        .filter((v) => !v.revoked_at)
        .map((v) => v.attested_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const attesterNames = new Map<string, string>();
  if (attesterIds.length > 0) {
    const namesRes = await supabase.from("profiles").select("id, full_name").in("id", attesterIds);
    if (namesRes.error) {
      // The attestation still shows, with the role alone.
      console.error("[residents] attester names failed", namesRes.error.code, namesRes.error.message);
    }
    for (const p of (namesRes.data ?? []) as { id: string; full_name: string | null }[]) {
      const name = sanitizeName(p.full_name ?? "");
      if (name.length > 0) attesterNames.set(p.id, name);
    }
  }

  const byResident = new Map<string, RawVerification[]>();
  for (const v of verifications) {
    byResident.set(v.resident_id, [...(byResident.get(v.resident_id) ?? []), v]);
  }

  const residents = rows.map((r): ResidentRow => {
    const own = byResident.get(r.id) ?? [];
    // At most one attestation is active per resident, by the backend's rule.
    const active = own.find((v) => !v.revoked_at) ?? null;
    const lastRevoked =
      own
        .filter((v) => v.revoked_at)
        .sort((a, b) => Date.parse(b.revoked_at ?? "") - Date.parse(a.revoked_at ?? ""))[0] ?? null;
    const name = sanitizeName(r.full_name ?? "");
    return {
      id: r.id,
      name: name.length > 0 ? name : null,
      phoneEnding: phoneEnding(r.phone),
      tier: r.trust_tier ?? "tier0",
      registeredOn: r.created_at ? manilaDate(r.created_at) : null,
      verification:
        active && active.verified_at
          ? {
              method: active.method ?? "",
              verifiedOn: manilaDate(active.verified_at),
              attestedBy: active.attested_by ? attesterNames.get(active.attested_by) ?? null : null,
              attestedRole: active.attested_role,
            }
          : null,
      lastRevocation:
        lastRevoked && lastRevoked.revoked_at
          ? {
              revokedOn: manilaDate(lastRevoked.revoked_at),
              reason: lastRevoked.revoke_reason,
              revokedRole: lastRevoked.revoked_role,
            }
          : null,
    };
  });

  return {
    residents,
    query,
    tier,
    limit: RESIDENT_LIMIT,
    capped,
    loadFailed: false,
    verificationsUnavailable,
  };
}

/** The last four digits of a phone number, or null when it has fewer. */
function phoneEnding(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
