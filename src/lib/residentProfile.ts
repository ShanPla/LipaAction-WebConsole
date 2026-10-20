// Resident profile and manual sanctions (backend issue SuryaZZDev/LipaAction#412,
// contract docs/contracts/resident-history-sanction.md in that repo).
//
// EVERY RPC name, argument name, row normalizer, error mapping and the ladder
// text the console uses for this feature lives in this one file. It has no
// server-only import so scripts/check-resident-profile.mjs can run it; the
// loaders take the Supabase client as an argument.
//
// Four authenticated-only RPCs, called under the signed-in official's own session:
//   report_reporter_ref(p_report_id)  -> uuid | NULL  (NULL = withheld, discreet, out of reach, unknown)
//   resident_profile_card(p_resident_id) -> one row, or ZERO rows (= 404)
//   resident_report_history(p_resident_id) -> newest first, max 200 rows, no withheld or discreet report
//   apply_manual_sanction(p_resident_id, p_report_id, p_track, p_reason, p_more_report_ids) -> uuid
//
// Privacy: a withheld or discreet report never appears here. No count is
// computed from rows the database did not hand over; visible_report_count is
// shown as given.
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/utils";

export const RPC = {
  reporterRef: "report_reporter_ref",
  card: "resident_profile_card",
  history: "resident_report_history",
  sanction: "apply_manual_sanction",
} as const;

export const REASON_MIN = 20;
export const REASON_MAX = 500;
/** Evidence reports per sanction, primary included. */
export const MAX_EVIDENCE = 10;

export type Track = "inaccurate" | "malicious";

/** The page path for a resident (the barangay console uses the real resident id). */
export const residentProfilePath = (residentId: string) => `/residents/${residentId}`;

// ---- who sees what (the database decides; this only keeps dead buttons off the screen) ----
/** barangay_admin and senior_barangay_admin. A desk officer sees nothing of this. */
export function canViewResidentProfile(role: string | null | undefined): boolean {
  return role === "barangay_admin" || role === "senior_barangay_admin";
}
export const canSanction = canViewResidentProfile;
/** Malicious track: senior_barangay_admin only. */
export function canSanctionMalicious(role: string | null | undefined): boolean {
  return role === "senior_barangay_admin";
}

// ---- rows ----
export type ResidentCard = {
  residentId: string;
  displayName: string | null;
  barangayName: string | null;
  trustTier: string;
  trustScore: number | null;
  memberSince: string | null;
  sanctionState: string;
  cooldownUntil: string | null;
  suspensionStatus: string | null;
  inaccurateStrikes: number;
  maliciousStrikes: number;
  visibleReportCount: number;
};

export type HistoryRow = {
  reportId: string;
  createdAt: string | null;
  category: string | null;
  priorityClass: string | null;
  priorityName: string | null;
  status: string | null;
  outcome: string | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const int = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0);
const rows = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object") : [];

/** resident_profile_card's first row, or null (zero rows, or a malformed row). */
export function normalizeCard(data: unknown): ResidentCard | null {
  const r = rows(data)[0];
  if (!r || !isUuid(r.resident_id)) return null;
  const score = r.trust_score === null || r.trust_score === undefined ? NaN : Number(r.trust_score);
  return {
    residentId: r.resident_id,
    displayName: str(r.display_name),
    barangayName: str(r.barangay_name),
    trustTier: str(r.trust_tier) ?? "tier0",
    trustScore: Number.isFinite(score) ? score : null,
    memberSince: str(r.member_since),
    sanctionState: str(r.sanction_state) ?? "none",
    cooldownUntil: str(r.cooldown_until),
    suspensionStatus: str(r.suspension_status),
    inaccurateStrikes: int(r.inaccurate_strike_count),
    maliciousStrikes: int(r.malicious_strike_count),
    visibleReportCount: int(r.visible_report_count),
  };
}

/** The history exactly as given: newest first, nothing added, nothing counted. */
export function normalizeHistory(data: unknown): HistoryRow[] {
  const out: HistoryRow[] = [];
  for (const r of rows(data)) {
    if (!isUuid(r.report_id)) continue;
    out.push({
      reportId: r.report_id,
      createdAt: str(r.created_at),
      category: str(r.category),
      priorityClass: str(r.priority_class),
      priorityName: str(r.priority_name),
      status: str(r.status),
      outcome: str(r.outcome),
    });
  }
  return out;
}

// ---- the ladder, for the confirmation text only (the database is the authority) ----
export type SanctionEffect = {
  delta: number;
  kind: "cooldown" | "suspension";
  cooldownHours: number | null; // 1, 24 or 168
  liftedBy: "barangay_admin" | "senior_barangay_admin" | null;
};

/** What the NEXT strike on a track does, from the card's strike counts. */
export function sanctionEffect(track: Track, card: Pick<ResidentCard, "inaccurateStrikes" | "maliciousStrikes">): SanctionEffect {
  if (track === "malicious") {
    return card.maliciousStrikes + 1 === 1
      ? { delta: -0.2, kind: "cooldown", cooldownHours: 168, liftedBy: null }
      : { delta: -0.2, kind: "suspension", cooldownHours: null, liftedBy: "senior_barangay_admin" };
  }
  const strike = card.inaccurateStrikes + 1;
  if (strike === 1) return { delta: -0.05, kind: "cooldown", cooldownHours: 1, liftedBy: null };
  if (strike === 2) return { delta: -0.1, kind: "cooldown", cooldownHours: 24, liftedBy: null };
  return { delta: -0.1, kind: "suspension", cooldownHours: null, liftedBy: "barangay_admin" };
}

// ---- the form's evidence list ----
/**
 * Ticks or unticks one report. Order matters: the first one ticked is the
 * primary evidence. A tick beyond MAX_EVIDENCE is ignored; an id that is not
 * in `offered` (the history rows) is ignored, so the list can never hold
 * anything the database did not hand over.
 */
export function toggleEvidence(selected: readonly string[], reportId: string, offered: readonly string[]): string[] {
  if (selected.includes(reportId)) return selected.filter((id) => id !== reportId);
  if (!offered.includes(reportId) || selected.length >= MAX_EVIDENCE) return [...selected];
  return [...selected, reportId];
}

export type InputProblem = "resident" | "evidence" | "tooManyEvidence" | "track" | "reasonShort" | "reasonLong";
export type SanctionInput = {
  residentId: string;
  primaryReportId: string;
  moreReportIds: string[];
  track: Track;
  reason: string;
};

/** Proves the shape of a sanction before any round trip; the database checks again. */
export function normalizeSanctionInput(raw: {
  residentId?: unknown; reportIds?: unknown; track?: unknown; reason?: unknown;
}): SanctionInput | InputProblem {
  if (!isUuid(raw.residentId)) return "resident";
  if (raw.track !== "inaccurate" && raw.track !== "malicious") return "track";
  if (!Array.isArray(raw.reportIds) || raw.reportIds.length === 0) return "evidence";
  if (raw.reportIds.length > MAX_EVIDENCE) return "tooManyEvidence";
  if (!raw.reportIds.every(isUuid)) return "evidence";
  const ids = raw.reportIds as string[];
  if (new Set(ids.map((i) => i.toLowerCase())).size !== ids.length) return "evidence";
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason.length < REASON_MIN) return "reasonShort";
  if (reason.length > REASON_MAX) return "reasonLong";
  return { residentId: raw.residentId, primaryReportId: ids[0], moreReportIds: ids.slice(1), track: raw.track, reason };
}

/**
 * The RPC's arguments. p_more_report_ids is left out when there is only one
 * evidence report, so the four-argument call works before the multi-evidence
 * migration (20261210110000) is pushed.
 */
export function sanctionArgs(input: SanctionInput): Record<string, unknown> {
  const args: Record<string, unknown> = {
    p_resident_id: input.residentId,
    p_report_id: input.primaryReportId,
    p_track: input.track,
    p_reason: input.reason,
  };
  if (input.moreReportIds.length > 0) args.p_more_report_ids = input.moreReportIds;
  return args;
}

// ---- error mapping (SQLSTATE first, the message only to tell causes apart) ----
export type SanctionFailure =
  | "notAllowed"      // 42501: "You can't do that."
  | "notAvailable"    // 42501: "That resident or report isn't available."
  | "invalidInput"    // 22023: check the track, the evidence and the reason
  | "tooManyEvidence" // 22023: at most 10 evidence
  | "harsher"         // 55000: same or harsher sanction already
  | "alreadyCounted"  // 55000: report already counted
  | "sessionExpired" | "unreachable" | "failed";

type PgError = { code?: string | null; message?: string | null } | null | undefined;

export function sanctionFailure(error: PgError, status = 400): SanctionFailure {
  const code = error?.code ?? "";
  const msg = error?.message ?? "";
  if (status === 0) return "unreachable";
  if (status === 401 || code.startsWith("PGRST30")) return "sessionExpired";
  if (code === "42501") {
    // Role refusals and the malicious track without a senior admin: "You can't
    // do that." Yourself, not found, not visible: "isn't available".
    return /not found|not visible|yourself/i.test(msg) ? "notAvailable" : "notAllowed";
  }
  if (code === "22023") return /at most 10 evidence/i.test(msg) ? "tooManyEvidence" : "invalidInput";
  if (code === "55000") {
    if (/already counted/i.test(msg)) return "alreadyCounted";
    if (/same or a harsher/i.test(msg)) return "harsher";
  }
  return "failed";
}

/** What the server action answers: a code, never a database message. */
export type SanctionResult = { ok: true } | { ok: false; reason: SanctionFailure | InputProblem };

type RpcClient = Pick<SupabaseClient, "rpc">;

/** Runs one manual sanction under the caller's own session. */
export async function runManualSanction(
  supabase: RpcClient,
  raw: { residentId?: unknown; reportIds?: unknown; track?: unknown; reason?: unknown }
): Promise<SanctionResult> {
  const input = normalizeSanctionInput(raw ?? {});
  if (typeof input === "string") return { ok: false, reason: input };
  const { error, status } = await supabase.rpc(RPC.sanction, sanctionArgs(input));
  if (!error) return { ok: true };
  // Codes and ids only in the log; the message stays out of the browser.
  console.error(`[${RPC.sanction}] not done`, JSON.stringify({ resident: input.residentId, status, code: error.code }));
  return { ok: false, reason: sanctionFailure(error, status) };
}

// ---- loaders ----
export type CardLoad = { ok: true; card: ResidentCard | null } | { ok: false };
export type HistoryLoad = { ok: true; rows: HistoryRow[] } | { ok: false };

/** The card; ok with card null = 404 (zero rows, or the database refused this caller). */
export async function loadResidentCard(supabase: RpcClient, residentId: string): Promise<CardLoad> {
  try {
    const { data, error } = await supabase.rpc(RPC.card, { p_resident_id: residentId });
    if (error) {
      console.error(`[${RPC.card}] failed`, error.code);
      return error.code === "42501" ? { ok: true, card: null } : { ok: false };
    }
    return { ok: true, card: normalizeCard(data) };
  } catch {
    return { ok: false };
  }
}

export async function loadResidentHistory(supabase: RpcClient, residentId: string): Promise<HistoryLoad> {
  try {
    const { data, error } = await supabase.rpc(RPC.history, { p_resident_id: residentId });
    if (error) {
      console.error(`[${RPC.history}] failed`, error.code);
      return { ok: false };
    }
    return { ok: true, rows: normalizeHistory(data) };
  } catch {
    return { ok: false };
  }
}

/**
 * The report drawer's link: the profile path, or null. Shown only when
 * report_reporter_ref returns an id AND the card comes back with a row, so a
 * withheld or discreet report, a resident with no card, a refusal or any
 * failure shows no link at all.
 */
export async function loadResidentLink(supabase: RpcClient, reportId: string): Promise<string | null> {
  if (!isUuid(reportId)) return null;
  try {
    const { data, error } = await supabase.rpc(RPC.reporterRef, { p_report_id: reportId });
    if (error || !isUuid(data)) return null;
    const loaded = await loadResidentCard(supabase, data);
    return loaded.ok && loaded.card ? residentProfilePath(data) : null;
  } catch {
    return null;
  }
}
