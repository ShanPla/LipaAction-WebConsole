import "server-only";
import { createClient } from "@/lib/supabase/server";
import { phoneEnding } from "@/lib/data/residents";
import { readSanction } from "@/lib/sanctions";
import { manilaDate, sanitizeName } from "@/lib/utils";

interface RawSanctioned {
  id: string;
  full_name: string | null;
  phone: string | null;
  trust_score: number | string | null;
  inaccurate_strike_count: number | null;
  malicious_strike_count: number | null;
  cooldown_until: string | null;
  cooldown_track: string | null;
  suspension_status: string | null;
  suspended_at: string | null;
}

interface RawHistory {
  id: string;
  resident_id: string;
  cause: string | null;
  score_before: number | string | null;
  score_after: number | string | null;
  inaccurate_strike_count: number | null;
  malicious_strike_count: number | null;
  sanction: string | null;
  created_at: string;
}

/** One line of a resident's sanction history: a strike, or a lift. */
export interface SanctionHistoryEntry {
  id: string;
  // The backend's value (inaccurate, malicious, sanction_lifted); the page
  // labels the ones it knows and shows any other as itself.
  cause: string;
  // The day, never the hour: see getSanctions().
  on: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  inaccurateStrikes: number | null;
  maliciousStrikes: number | null;
  // none, cooldown, suspension or lifted, as stored.
  sanction: string;
  // A lift's reason only: the lifting official's own words about the appeal.
  liftReason: string | null;
}

export interface SanctionRow {
  residentId: string;
  // As on Verify Resident: sanitised, null when the profile carries none,
  // with the phone number's last four digits to tell accounts apart.
  name: string | null;
  phoneEnding: string | null;
  kind: "suspension" | "cooldown";
  track: string;
  seniorOnly: boolean;
  // The Manila day the running cooldown ends, and nothing finer: its exact
  // end is the moment of the strike plus a fixed length, and time left in
  // hours would give the strike's time of day to within an hour, beside a
  // queue that shows the minute an agency closed each report. Null for a
  // suspension with no cooldown running.
  cooldownEndsOn: string | null;
  // The running cooldown's own track, when the resident is also suspended.
  cooldownTrack: string | null;
  suspendedOn: string | null;
  inaccurateStrikes: number;
  maliciousStrikes: number;
  trustScore: number | null;
  history: SanctionHistoryEntry[];
}

export interface SanctionsData {
  rows: SanctionRow[];
  limit: number;
  // True when more residents are sanctioned than the page loads.
  capped: boolean;
  // True when the query failed and the empty list is a fallback.
  loadFailed: boolean;
  // True when the history rows couldn't be read: the sanctions still show.
  historyUnavailable: boolean;
}

/** For the admin home's cards: sanctions any admin may lift, and senior-only ones. */
export interface SanctionCounts {
  liftable: number;
  seniorOnly: number;
}

// The ids of the residents listed travel in the history request's URL, so
// the list stays where that URL stays short.
const SANCTION_LIMIT = 100;
// The causes the history shows. An allow-list: a cause the backend adds
// later stays unread until someone decides what it may say about a resident.
const HISTORY_CAUSES = ["inaccurate", "malicious", "sanction_lifted"];
const HISTORY_LIMIT = 500;
const COUNT_LIMIT = 1000;

const toNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Residents with a sanction now: suspended, or with a cooldown still running.
 * PostgREST's `or`, with the time quoted so its colons and dots are read as
 * part of the value.
 */
function sanctionedNow(nowIso: string): string {
  return `suspension_status.not.is.null,cooldown_until.gt."${nowIso}"`;
}

/**
 * The active cooldowns and suspensions of one barangay's residents (thesis
 * A.3.4), with each resident's strike and lift history.
 *
 * The page names the resident: an appeal is heard from a person, and the
 * official must be able to find them. What it never does is tie that name to
 * a report. The thesis's panel shows the report behind a strike and the
 * agency's reason for it; this loader reads neither. A strike comes from an
 * agency closing a report as false, so the report, or the agency's words
 * about it, beside a name would say who filed it, which no screen of this
 * console does, least of all for a report filed with identity withheld. For
 * the same reason a strike is dated by its day, a cooldown's end is given as
 * its day rather than a moment, and the rows that record a resident's
 * valid reports are not read at all. A lift's reason is the lifting
 * official's own, and is shown.
 *
 * Row-level security scopes both tables to the official's own barangay; the
 * filters below repeat that, as every loader's do.
 */
export async function getSanctions(barangayId: string): Promise<SanctionsData> {
  const supabase = createClient();
  const now = Date.now();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, trust_score, inaccurate_strike_count, malicious_strike_count, cooldown_until, cooldown_track, suspension_status, suspended_at"
    )
    // profiles holds officials too; only residents are sanctioned.
    .eq("role", "resident")
    .eq("barangay_id", barangayId)
    .or(sanctionedNow(new Date(now).toISOString()))
    .order("suspended_at", { ascending: true, nullsFirst: false })
    .order("cooldown_until", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    // One more than is shown: the only way to know more exist.
    .limit(SANCTION_LIMIT + 1);

  if (error || !data) {
    console.error("[sanctions] load failed", error?.code, error?.message);
    return { rows: [], limit: SANCTION_LIMIT, capped: false, loadFailed: true, historyUnavailable: false };
  }

  const capped = data.length > SANCTION_LIMIT;
  // Read again here, by the rule the cards and the buttons use, so that one
  // reading decides what is listed and who may lift it.
  const sanctioned = (data as RawSanctioned[])
    .slice(0, SANCTION_LIMIT)
    .map((r) => ({ raw: r, state: readSanction(r, now) }))
    .filter((x): x is { raw: RawSanctioned; state: NonNullable<ReturnType<typeof readSanction>> } => x.state !== null);
  const ids = sanctioned.map((x) => x.raw.id);

  // Strikes and lifts, without their reasons; then the reasons of lifts
  // alone. Two queries so that a strike's reason is never read, not merely
  // never shown.
  const [historyRes, liftReasonsRes] =
    ids.length > 0
      ? await Promise.all([
          supabase
            .from("trust_score_history")
            .select(
              "id, resident_id, cause, score_before, score_after, inaccurate_strike_count, malicious_strike_count, sanction, created_at"
            )
            .in("resident_id", ids)
            // Strikes and lifts only. The rows for valid reports say when a
            // resident reported, and nothing an appeal needs.
            .in("cause", HISTORY_CAUSES)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(HISTORY_LIMIT),
          supabase
            .from("trust_score_history")
            .select("id, reason")
            .in("resident_id", ids)
            .eq("cause", "sanction_lifted")
            .limit(HISTORY_LIMIT),
        ])
      : [
          { data: [] as RawHistory[], error: null },
          { data: [] as { id: string; reason: string | null }[], error: null },
        ];

  const historyUnavailable = Boolean(historyRes.error);
  if (historyRes.error) {
    console.error("[sanctions] history failed", historyRes.error.code, historyRes.error.message);
  }
  if (liftReasonsRes.error) {
    // The lifts still show, without their reasons.
    console.error("[sanctions] lift reasons failed", liftReasonsRes.error.code, liftReasonsRes.error.message);
  }
  const liftReasons = new Map<string, string>();
  for (const r of (liftReasonsRes.data ?? []) as { id: string; reason: string | null }[]) {
    if (r.reason) liftReasons.set(r.id, r.reason);
  }

  const historyByResident = new Map<string, SanctionHistoryEntry[]>();
  for (const h of (historyRes.data ?? []) as RawHistory[]) {
    const entry: SanctionHistoryEntry = {
      id: h.id,
      cause: h.cause ?? "",
      on: manilaDate(h.created_at),
      scoreBefore: toNumber(h.score_before),
      scoreAfter: toNumber(h.score_after),
      inaccurateStrikes: h.inaccurate_strike_count,
      maliciousStrikes: h.malicious_strike_count,
      sanction: h.sanction ?? "",
      liftReason: h.cause === "sanction_lifted" ? liftReasons.get(h.id) ?? null : null,
    };
    historyByResident.set(h.resident_id, [...(historyByResident.get(h.resident_id) ?? []), entry]);
  }

  const rows = sanctioned.map(({ raw, state }): SanctionRow => {
    const name = sanitizeName(raw.full_name ?? "");
    return {
      residentId: raw.id,
      name: name.length > 0 ? name : null,
      phoneEnding: phoneEnding(raw.phone),
      kind: state.kind,
      track: state.track,
      seniorOnly: state.seniorOnly,
      cooldownEndsOn: state.cooldownActive && raw.cooldown_until ? manilaDate(raw.cooldown_until) : null,
      cooldownTrack: state.kind === "suspension" && state.cooldownActive ? raw.cooldown_track : null,
      suspendedOn: state.kind === "suspension" && raw.suspended_at ? manilaDate(raw.suspended_at) : null,
      inaccurateStrikes: raw.inaccurate_strike_count ?? 0,
      maliciousStrikes: raw.malicious_strike_count ?? 0,
      trustScore: toNumber(raw.trust_score),
      history: historyByResident.get(raw.id) ?? [],
    };
  });

  return { rows, limit: SANCTION_LIMIT, capped, loadFailed: false, historyUnavailable };
}

/**
 * How many sanctions stand in the barangay now, split by who may lift them,
 * for the admin home's cards (thesis A.3.1). Null when the count couldn't be
 * read, which the card shows as a dash rather than a zero.
 */
export async function getSanctionCounts(barangayId: string): Promise<SanctionCounts | null> {
  const supabase = createClient();
  const now = Date.now();
  const { data, error } = await supabase
    .from("profiles")
    .select("suspension_status, cooldown_until, cooldown_track")
    .eq("role", "resident")
    .eq("barangay_id", barangayId)
    .or(sanctionedNow(new Date(now).toISOString()))
    .limit(COUNT_LIMIT);

  if (error || !data) {
    console.error("[sanctions] count failed", error?.code, error?.message);
    return null;
  }

  const counts: SanctionCounts = { liftable: 0, seniorOnly: 0 };
  for (const row of data as Pick<RawSanctioned, "suspension_status" | "cooldown_until" | "cooldown_track">[]) {
    const state = readSanction(row, now);
    if (!state) continue;
    if (state.seniorOnly) counts.seniorOnly += 1;
    else counts.liftable += 1;
  }
  return counts;
}
