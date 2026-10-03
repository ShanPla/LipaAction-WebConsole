import "server-only";
import { createClient } from "@/lib/supabase/server";
import { manilaTimestamp, startOfManilaDay } from "@/lib/utils";

/** One barangay's verification activity over the window. */
export interface BarangayVerification {
  barangayId: string;
  // Null when the barangay's name couldn't be read; the page says so.
  name: string | null;
  // Tier 1 promotions made in the window.
  promotions: number;
  // Of those, how many have since been revoked.
  revoked: number;
  // How many different officials attested. A count: no official is named.
  officials: number;
  // One count of promotions per day in CityVerificationData.days, oldest first.
  daily: number[];
  // Reports by verified residents that an agency closed in the window, and
  // how many of those were closed as false. Null when that couldn't be read.
  closedReports: number | null;
  falseReports: number | null;
  // True when this barangay's false share is above the city's, on enough
  // closed reports to mean something (see MIN_CLOSED_FOR_FLAG).
  aboveCityRate: boolean;
}

export interface CityVerificationData {
  days: string[]; // YYYY-MM-DD in Manila, oldest first, today last
  barangays: BarangayVerification[];
  totals: { promotions: number; revoked: number; closedReports: number | null; falseReports: number | null };
  windowDays: number;
  minClosedForFlag: number;
  limit: number;
  capped: boolean;
  // True when the promotions couldn't be read and the zeros are a fallback.
  loadFailed: boolean;
  // True when the false-report figures couldn't be read; the rest stands.
  outcomesUnavailable: boolean;
}

interface VerificationRow {
  barangay_id: string | null;
  attested_by: string | null;
  verified_at: string;
  revoked_at: string | null;
}

interface OutcomeRow {
  resident_id: string;
  barangay_id: string | null;
  cause: string;
  created_at: string;
}

interface SpanRow {
  resident_id: string;
  verified_at: string;
  revoked_at: string | null;
}

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Far above the pilot's volume for a month. A list cut short is said on the
// page, by the database's own count: the project also caps the rows of one
// request, possibly below this, and a cut list must not pass as whole.
const ROW_LIMIT = 5000;
// Ids per .in() request: they travel in the URL.
const ID_CHUNK = 100;
// A barangay is marked only on at least this many closed reports: one false
// report out of one is a rate of 100% and tells nobody anything.
const MIN_CLOSED_FOR_FLAG = 5;
// What an agency's closure does to a reporter's trust record: these are the
// closures that count as a report having been judged.
const JUDGED = ["valid", "inaccurate", "malicious"];
const FALSE = new Set(["inaccurate", "malicious"]);

/**
 * The thesis's Cross-Barangay Verification Quality view (A.5.2): for each
 * barangay over the last 30 Manila days, the Tier 1 promotions made, how
 * many were later revoked, how many officials made them, a day-by-day trend,
 * and the false-report rate attributable to verification: of the reports by
 * verified residents that agencies closed, the share closed as false.
 *
 * No person is named or shown: officials are a count, and residents appear
 * in no figure. One thing here is unlike every other city loader, and is
 * said plainly: to tell whether a closed report came from a verified
 * resident, the resident ids on the trust records are matched against the
 * resident ids on the attestations. The ids are read for that match and
 * nothing else, no name or phone is read with them, and only the counts
 * per barangay leave this function.
 *
 * The thesis's column is a [contestation rate]; what the system records is
 * a revocation, so that is what is counted, as on the barangay's report #13.
 */
export async function getCityVerification(): Promise<CityVerificationData> {
  const today = startOfManilaDay().getTime();
  const start = today - (WINDOW_DAYS - 1) * DAY_MS;
  const startIso = new Date(start).toISOString();
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => manilaTimestamp(new Date(start + i * DAY_MS).toISOString()).slice(0, 10));
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const base = {
    days,
    windowDays: WINDOW_DAYS,
    minClosedForFlag: MIN_CLOSED_FOR_FLAG,
    limit: ROW_LIMIT,
  };

  const supabase = createClient();
  const [verificationsRes, barangaysRes, outcomesRes] = await Promise.all([
    supabase
      .from("verifications")
      .select("barangay_id, attested_by, verified_at, revoked_at", { count: "exact" })
      .gte("verified_at", startIso)
      .order("verified_at", { ascending: false })
      .limit(ROW_LIMIT),
    supabase.from("barangays").select("id, name").limit(500),
    supabase
      .from("trust_score_history")
      .select("resident_id, barangay_id, cause, created_at", { count: "exact" })
      .in("cause", JUDGED)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT),
  ]);

  if (verificationsRes.error || !verificationsRes.data) {
    console.error("[city-verification] load failed", verificationsRes.error?.code, verificationsRes.error?.message);
    return {
      ...base,
      barangays: [],
      totals: { promotions: 0, revoked: 0, closedReports: null, falseReports: null },
      capped: false,
      loadFailed: true,
      outcomesUnavailable: true,
    };
  }
  if (barangaysRes.error) {
    // The rows still show, with the name said to be unavailable.
    console.error("[city-verification] barangays failed", barangaysRes.error.code, barangaysRes.error.message);
  }

  const verifications = verificationsRes.data as VerificationRow[];
  const outcomes = outcomesRes.error ? null : ((outcomesRes.data ?? []) as OutcomeRow[]);
  if (outcomesRes.error) {
    console.error("[city-verification] outcomes failed", outcomesRes.error.code, outcomesRes.error.message);
  }

  // Which of the judged reports came from a resident who was verified when
  // the agency closed it. The trust record carries the moment of the closure
  // and no link to the report, so the moment of filing can't be used. Every
  // attestation those residents ever held is read, not only the window's,
  // since one made last year still stands today.
  let judged: { barangayId: string; isFalse: boolean }[] | null = null;
  if (outcomes !== null) {
    const spans = await loadSpans(supabase, [...new Set(outcomes.map((o) => o.resident_id))]);
    if (spans !== null) {
      judged = [];
      for (const o of outcomes) {
        if (!o.barangay_id) continue;
        const at = Date.parse(o.created_at);
        const verified = (spans.get(o.resident_id) ?? []).some(
          (s) => Date.parse(s.verified_at) <= at && (s.revoked_at === null || Date.parse(s.revoked_at) > at)
        );
        if (verified) judged.push({ barangayId: o.barangay_id, isFalse: FALSE.has(o.cause) });
      }
    }
  }
  const outcomesUnavailable = judged === null;

  const names = new Map<string, string>();
  for (const b of (barangaysRes.data ?? []) as { id: string; name: string | null }[]) {
    const name = b.name?.trim();
    if (name) names.set(b.id, name);
  }

  // Every barangay that is known, or that has anything to show.
  const ids = new Set<string>([...names.keys()]);
  for (const v of verifications) if (v.barangay_id) ids.add(v.barangay_id);
  for (const j of judged ?? []) ids.add(j.barangayId);

  const cityClosed = judged?.length ?? 0;
  const cityFalse = judged?.filter((j) => j.isFalse).length ?? 0;
  const cityRate = cityClosed > 0 ? cityFalse / cityClosed : 0;

  const barangays = [...ids].map((barangayId): BarangayVerification => {
    const own = verifications.filter((v) => v.barangay_id === barangayId);
    const daily = days.map(() => 0);
    for (const v of own) {
      const index = dayIndex.get(manilaTimestamp(v.verified_at).slice(0, 10));
      if (index !== undefined) daily[index] += 1;
    }
    const closed = judged === null ? null : judged.filter((j) => j.barangayId === barangayId);
    const closedReports = closed === null ? null : closed.length;
    const falseReports = closed === null ? null : closed.filter((j) => j.isFalse).length;
    return {
      barangayId,
      name: names.get(barangayId) ?? null,
      promotions: own.length,
      revoked: own.filter((v) => v.revoked_at).length,
      officials: new Set(own.map((v) => v.attested_by).filter(Boolean)).size,
      daily,
      closedReports,
      falseReports,
      aboveCityRate:
        closedReports !== null &&
        falseReports !== null &&
        closedReports >= MIN_CLOSED_FOR_FLAG &&
        falseReports / closedReports > cityRate,
    };
  });

  barangays.sort((a, b) => b.promotions - a.promotions || (a.name ?? "￿").localeCompare(b.name ?? "￿"));

  return {
    ...base,
    barangays,
    totals: {
      promotions: verifications.length,
      revoked: verifications.filter((v) => v.revoked_at).length,
      closedReports: judged === null ? null : cityClosed,
      falseReports: judged === null ? null : cityFalse,
    },
    capped:
      (verificationsRes.count ?? verifications.length) > verifications.length ||
      (outcomes !== null && (outcomesRes.count ?? outcomes.length) > outcomes.length),
    loadFailed: false,
    outcomesUnavailable,
  };
}

/**
 * Every attestation, past and present, of the residents whose reports were
 * judged in the window: when each began and, if revoked, when it ended. Null
 * when a read failed, and the false-report figures are then left out rather
 * than computed from part of the picture.
 */
async function loadSpans(
  supabase: ReturnType<typeof createClient>,
  residentIds: string[]
): Promise<Map<string, SpanRow[]> | null> {
  const spans = new Map<string, SpanRow[]>();
  if (residentIds.length === 0) return spans;

  const chunks: string[][] = [];
  for (let i = 0; i < residentIds.length; i += ID_CHUNK) chunks.push(residentIds.slice(i, i + ID_CHUNK));
  const results = await Promise.all(
    chunks.map((c) => supabase.from("verifications").select("resident_id, verified_at, revoked_at").in("resident_id", c))
  );
  const failed = results.find((r) => r.error || !r.data);
  if (failed) {
    console.error("[city-verification] attestation spans failed", failed.error?.code, failed.error?.message);
    return null;
  }
  for (const s of results.flatMap((r) => (r.data ?? []) as SpanRow[])) {
    spans.set(s.resident_id, [...(spans.get(s.resident_id) ?? []), s]);
  }
  return spans;
}
