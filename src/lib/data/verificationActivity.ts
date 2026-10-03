import "server-only";
import { createClient } from "@/lib/supabase/server";
import { manilaDayStart, manilaTimestamp, sanitizeName } from "@/lib/utils";

/** One official's Tier 1 verifications in the week. */
export interface OfficialVerificationActivity {
  // A row key for the page. Not the official's account id, which stays here.
  key: string;
  // Null when the profile has no usable name, or the names couldn't be read
  // (see VerificationActivityData.namesUnavailable).
  name: string | null;
  // The role recorded with the official's newest attestation of the week.
  role: string | null;
  promotions: number;
  // By how residency was established. `other` holds any method this console
  // doesn't know, so the three named ones never claim to be the whole.
  inPerson: number;
  field: number;
  bulkImport: number;
  other: number;
  // Of this week's promotions, how many a senior admin has since revoked.
  revoked: number;
}

export interface VerificationActivityData {
  weekEnd: string; // YYYY-MM-DD in Manila: the last day of the week shown
  weekStart: string; // six days before it
  today: string; // the latest day that can be picked
  officials: OfficialVerificationActivity[];
  totals: { promotions: number; revoked: number };
  namesUnavailable: boolean;
  limit: number;
  capped: boolean;
  loadFailed: boolean;
}

interface VerificationRow {
  attested_by: string | null;
  attested_role: string | null;
  method: string | null;
  verified_at: string;
  revoked_at: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
// Far above what a barangay attests in a week. A list cut short is reported,
// by the database's own count: the project also caps the rows of one
// request, possibly below this, and a cut list must not pass as whole.
const ROW_LIMIT = 2000;

/**
 * The paper's Weekly Verification Activity by Official (#13, Table p.146):
 * for the seven Manila days ending on the chosen one, each official's Tier 1
 * promotions, by method, and how many of them have since been revoked.
 *
 * The paper's column is a [contestation rate]. Nothing records a contest as
 * such; what the system records is a senior admin revoking an attestation,
 * so that is what is counted, and the page calls it what it is.
 *
 * Officials are named, as Validation History names the official behind each
 * decision. No resident is read: not a name, not an account id.
 *
 * Row-level security scopes verifications to the official's own barangay;
 * the filter below repeats that, as every loader's does.
 */
export async function getVerificationActivity(
  barangayId: string,
  requestedWeekEnd: unknown
): Promise<VerificationActivityData> {
  const today = manilaTimestamp(new Date().toISOString()).slice(0, 10);
  const weekEnd = resolveWeekEnd(requestedWeekEnd, today);
  const lastDay = manilaDayStart(weekEnd) as number;
  const start = lastDay - (WEEK_DAYS - 1) * DAY_MS;
  const end = lastDay + DAY_MS;
  const weekStart = manilaTimestamp(new Date(start).toISOString()).slice(0, 10);
  const empty = (loadFailed: boolean): VerificationActivityData => ({
    weekEnd,
    weekStart,
    today,
    officials: [],
    totals: { promotions: 0, revoked: 0 },
    namesUnavailable: false,
    limit: ROW_LIMIT,
    capped: false,
    loadFailed,
  });

  const supabase = createClient();
  const { data, error, count } = await supabase
    .from("verifications")
    .select("attested_by, attested_role, method, verified_at, revoked_at", { count: "exact" })
    .eq("barangay_id", barangayId)
    .gte("verified_at", new Date(start).toISOString())
    .lt("verified_at", new Date(end).toISOString())
    .order("verified_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (error || !data) {
    console.error("[verification-activity] load failed", error?.code, error?.message);
    return empty(true);
  }

  const rows = data as VerificationRow[];
  // Newest first, so the first row seen for an official carries the role to show.
  const byOfficial = new Map<string, VerificationRow[]>();
  for (const r of rows) {
    const key = r.attested_by ?? "";
    byOfficial.set(key, [...(byOfficial.get(key) ?? []), r]);
  }

  const ids = [...byOfficial.keys()].filter((id) => id !== "");
  const names = new Map<string, string>();
  let namesUnavailable = false;
  if (ids.length > 0) {
    const namesRes = await supabase.from("profiles").select("id, full_name").in("id", ids);
    if (namesRes.error) {
      // Unknown, not absent: the page says [Name unavailable], never [Unnamed].
      console.error("[verification-activity] names failed", namesRes.error.code, namesRes.error.message);
      namesUnavailable = true;
    }
    for (const p of (namesRes.data ?? []) as { id: string; full_name: string | null }[]) {
      const name = sanitizeName(p.full_name ?? "");
      if (name.length > 0) names.set(p.id, name);
    }
  }

  const officials = [...byOfficial].map(([id, group], index): OfficialVerificationActivity => {
    const count = (method: string) => group.filter((r) => r.method === method).length;
    const inPerson = count("in_person");
    const field = count("field");
    const bulkImport = count("bulk_import");
    return {
      key: `o${index}`,
      name: names.get(id) ?? null,
      role: group[0].attested_role,
      promotions: group.length,
      inPerson,
      field,
      bulkImport,
      other: group.length - inPerson - field - bulkImport,
      revoked: group.filter((r) => r.revoked_at).length,
    };
  });

  officials.sort((a, b) => b.promotions - a.promotions || (a.name ?? "￿").localeCompare(b.name ?? "￿"));

  return {
    ...empty(false),
    officials,
    totals: { promotions: rows.length, revoked: rows.filter((r) => r.revoked_at).length },
    namesUnavailable,
    capped: (count ?? rows.length) > rows.length,
  };
}

/**
 * The week's last day. Anything that isn't a real calendar day falls back to
 * today, and so does a future one.
 */
export function resolveWeekEnd(requested: unknown, today: string): string {
  if (manilaDayStart(requested) === null) return today;
  return (requested as string) > today ? today : (requested as string);
}
