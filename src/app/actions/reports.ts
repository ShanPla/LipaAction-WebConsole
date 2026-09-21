"use server";

import { revalidatePath } from "next/cache";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
// Constants live in utils, not here: a "use server" file may export only
// async functions, and ReasonPromptModal needs the same limit.
import { isUuid, MAX_REASON_LENGTH } from "@/lib/utils";

/*
 * Every function in this file is a public POST endpoint. Its arguments are
 * whatever the caller sent — TypeScript's parameter types describe the
 * console's own call sites, and nothing more. Each action therefore proves
 * the shape of its input before doing any work: a report id must be a uuid,
 * a decision must be one of two literals, a reason must be a bounded string,
 * and a bulk list must be a short array of distinct uuids.
 */

interface UpdateResult {
  success: boolean;
  message?: string;
}

// Same wording as profile.ts, so an expired session reads the same
// everywhere it can surface.
const SESSION_EXPIRED = "Your session expired. Sign in again.";
const UNREACHABLE = "Couldn't reach the server. Check your connection, then try again.";
const INVALID_REQUEST = "That request wasn't valid. Refresh the page and try again.";

// A duplicate cluster big enough to need more than this is not something to
// validate in one click, and without a cap one POST could queue thousands of
// sequential RPCs.
const MAX_BULK = 50;

type SessionState = "active" | "expired" | "unreachable";

/**
 * Whether the caller still has a session — used only where an expired session
 * would otherwise produce a misleading answer rather than an error (routing's
 * first step is a SELECT, which under no session returns zero rows, not an
 * error, and would read as [not in your barangay]).
 *
 * Tri-state on purpose: an Auth outage or a network failure is not [signed
 * out], and telling an official their session expired when the server simply
 * couldn't be reached sends them to sign in again for nothing.
 */
async function sessionState(supabase: ReturnType<typeof createClient>): Promise<SessionState> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (user) return "active";
  if (error && isAuthRetryableFetchError(error)) return "unreachable";
  return "expired";
}

const SESSION_MESSAGE: Record<Exclude<SessionState, "active">, string> = {
  expired: SESSION_EXPIRED,
  unreachable: UNREACHABLE,
};

/**
 * Classifies a failed PostgREST call before any business meaning is read into
 * it. No pre-flight Auth call is needed for this, which is why validate and
 * reject no longer make one:
 *
 * - status 0: the request never got an HTTP answer (network, DNS, timeout).
 * - status 401, or a PGRST30x code: the request reached PostgREST without a
 *   usable user JWT and ran as anon. PostgREST answers an insufficient-
 *   privilege error with 401 for anon and 403 for a signed-in role, so 401 is
 *   the session signal and 403 stays a genuine refusal.
 */
function transportMessage(status: number, error: { code?: string }): string | null {
  if (status === 0) return UNREACHABLE;
  if (status === 401 || (error.code ?? "").startsWith("PGRST30")) return SESSION_EXPIRED;
  return null;
}

/**
 * THE CUTOVER — review_report() is the ONLY path to validate/reject a report.
 * Since the 2026-08-31 db push, prod's incident_reports_review_stamped CHECK
 * constraint makes a raw update({ status: 'validated' | 'rejected' }) fail
 * with 23514 — there is no fallback, and none should be added back.
 *
 * RLS scopes what review_report() may do (own-barangay for barangay roles,
 * city-wide for municipal_admin); this function doesn't re-check that.
 *
 * There used to be a getUser() pre-flight here, purely to choose a toast. It
 * cost a blocking Auth round trip on every click, and reported an Auth outage
 * as an expired session. The RPC's own answer now carries the same signal —
 * see transportMessage().
 */
export async function updateReportStatus(
  reportId: string,
  status: "validated" | "rejected",
  reason?: string
): Promise<UpdateResult> {
  if (!isUuid(reportId) || (status !== "validated" && status !== "rejected")) {
    return { success: false, message: INVALID_REQUEST };
  }

  let pReason: string | null = null;
  if (status === "rejected") {
    // typeof first: a caller can send a number or an object, and `.trim()` on
    // either would throw inside the action instead of answering.
    const trimmed = typeof reason === "string" ? reason.trim() : "";
    if (trimmed.length === 0) {
      return { success: false, message: "A reason is required to reject a report." };
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      return {
        success: false,
        message: `A reason can be at most ${MAX_REASON_LENGTH} characters.`,
      };
    }
    // The trimmed text is what's stored, not the original with its padding.
    pReason = trimmed;
  }

  const supabase = createClient();
  const { error, status: httpStatus } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_decision: status,
    p_reason: pReason,
  });

  if (error) {
    return {
      success: false,
      message: transportMessage(httpStatus, error) ?? messageForReviewError(error),
    };
  }

  revalidatePath("/queue");
  return { success: true };
}

/**
 * Maps review_report()'s SQLSTATEs to text this console owns. Never returns
 * the backend's message: that text is authored in another repo (or by
 * Postgres itself — 22023 isn't exclusive to the RPC's own RAISEs), it can
 * name internals, and it changes without this repo knowing. Branch on the
 * code, log the message server-side, show fixed copy.
 */
function messageForReviewError(error: { code?: string; message: string }): string {
  // 22023: bad decision value, or missing/empty reason on reject. The action
  // already checks both, so reaching this means something else was refused.
  // Neutral on purpose — the same mapper serves bulk validate, where
  // [a rejection needs a reason] would be false.
  if (error.code === "22023") {
    console.error("[review_report] 22023", error.message);
    return "That decision wasn't accepted. Refresh the report and try again.";
  }
  // 42501: not authorized — wrong role, wrong barangay, report not found,
  // or it already left the pending_priority/prioritized window.
  if (error.code === "42501") {
    return "Not permitted — wrong barangay, or already past review.";
  }
  // 55000: terminal-state conflict — someone else reviewed this report
  // between when the queue loaded and when this action fired.
  if (error.code === "55000") return "Someone else already reviewed this report.";
  console.error("[review_report] unexpected", error.code, error.message);
  return "Something went wrong. Try again.";
}

export interface RouteResult {
  success: boolean;
  message?: string;
  agencyCount?: number;
}

const ROUTE_FAILED = "Something went wrong. Nothing new was routed — try again.";

/**
 * Hands a validated report to the agencies its category maps to.
 *
 * Nothing does this automatically: review_report() stops at 'validated', and
 * auto_route() exists with no callers (backend owner, 2026-09-11). Until an
 * official routes it, a validated report reaches no agency at all. The steps
 * and their order are the backend owner's contract, mirrored from the
 * groupmate's shipped routeReport in apps/dashboards, and all run under the
 * official's own session — RLS decides each one:
 *
 *   a. read the report (RLS scopes it to the barangay)
 *   b. read category_agency_routing for its category
 *   c. insert agency_routing rows, auto_routed = false (ar_insert_barangay)
 *   d. log_audit('report_routed_manual')
 *   e. set status = 'routed' (the status trigger allows validated → routed)
 *
 * These are five separate calls, not a transaction, and the desk has no
 * DELETE on agency_routing — so a run that stops part-way can't be rolled
 * back, only finished. The action is written to be re-run: step c inserts
 * only agencies not already routed, and a report left 'validated' with
 * routing rows is offered [Finish routing], which lands here again. Step d
 * runs on every pass that reaches it, because a duplicate audit row is
 * acceptable and a missing one is not; for the same reason a failed audit
 * write stops the run before step e, since once the status is 'routed' the
 * report can never come back through here to be logged.
 *
 * No mapping for the category (e.g. other_emergency) is an answer, not an
 * error: the report needs barangay review, and no agency is invented.
 */
export async function routeReport(reportId: string): Promise<RouteResult> {
  if (!isUuid(reportId)) {
    return { success: false, message: INVALID_REQUEST };
  }

  const supabase = createClient();

  // a. — in parallel with the session check, which only has to decide how to
  // read an empty result: under no session this SELECT returns zero rows, not
  // an error.
  const [session, reportRes] = await Promise.all([
    sessionState(supabase),
    supabase.from("incident_reports").select("id, category, status").eq("id", reportId).maybeSingle(),
  ]);

  if (session !== "active") {
    return { success: false, message: SESSION_MESSAGE[session] };
  }

  const { data: report, error: reportError } = reportRes;
  if (reportError) {
    console.error("[routeReport] read failed", reportError.code, reportError.message);
    return { success: false, message: ROUTE_FAILED };
  }
  if (!report) {
    return { success: false, message: "That report isn't in your barangay, or no longer exists." };
  }
  if (report.status === "routed" || report.status === "resolved") {
    revalidatePath("/queue");
    return { success: false, message: "Already routed — another official may have routed it first." };
  }
  if (report.status !== "validated") {
    // rejected is terminal; pending hasn't been reviewed. Neither routes.
    return { success: false, message: "Only validated reports can be routed." };
  }

  // b.
  const { data: mapping, error: mappingError } = await supabase
    .from("category_agency_routing")
    .select("agency_id, is_primary, sort_order")
    .eq("category_key", report.category)
    .order("sort_order", { ascending: true });

  if (mappingError) {
    console.error("[routeReport] mapping read failed", mappingError.code, mappingError.message);
    return { success: false, message: ROUTE_FAILED };
  }

  // One entry per agency. Nothing in this repo proves (category_key,
  // agency_id) is unique in a table another repo owns, and a duplicate here
  // would make step c insert the same agency twice in one statement — a
  // guaranteed 23505. If an agency appears twice, it's primary if either
  // entry says so.
  const plan = new Map<string, boolean>();
  for (const m of mapping ?? []) {
    plan.set(m.agency_id as string, (plan.get(m.agency_id as string) ?? false) || Boolean(m.is_primary));
  }

  if (plan.size === 0) {
    return {
      success: false,
      message: "No agency is mapped to this category — it needs barangay review.",
    };
  }

  // c. Only the agencies not already routed. A second click, a retry after
  // a partial run, or another official routing at the same moment must not
  // produce a second row per agency.
  const existing = await routedAgencyIds(supabase, reportId);
  if (existing === null) return { success: false, message: ROUTE_FAILED };

  const missing = [...plan.keys()].filter((agencyId) => !existing.has(agencyId));
  if (missing.length > 0) {
    const rows = missing.map((agencyId) => routingRow(reportId, agencyId, plan.get(agencyId) ?? false));
    const { error: insertError } = await supabase.from("agency_routing").insert(rows);

    if (insertError?.code === "23505") {
      // agency_routing is UNIQUE (incident_report_id, agency_id), and a
      // multi-row INSERT is one statement: a single duplicate aborts it, so
      // NONE of this run's rows were written — not [they all exist]. Some
      // other writer got there first with at least one of them. Re-read, and
      // insert whatever is still missing one row at a time, where a 23505
      // really does mean that row is present.
      const recovered = await insertRemainingIndividually(supabase, reportId, plan);
      if (!recovered) {
        revalidatePath("/queue");
        return {
          success: false,
          message: "Couldn't confirm every agency received it. Select Finish routing to complete it.",
        };
      }
    } else if (insertError) {
      console.error("[routeReport] insert failed", insertError.code, insertError.message);
      return {
        success: false,
        message:
          insertError.code === "42501"
            ? "Not permitted — this report isn't in your barangay's scope."
            : ROUTE_FAILED,
      };
    }
  }

  // From here the agencies can already see the report. Every failure below
  // leaves it 'validated' with routing rows, which the queue shows as
  // [Routing incomplete] with a button that runs this action again.
  const incomplete = (what: string) => {
    revalidatePath("/queue");
    return {
      success: false,
      message: `Sent to the agencies, but ${what}. Select Finish routing to complete it.`,
    };
  };

  // d.
  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "report_routed_manual",
    p_report_id: reportId,
    p_metadata: { agency_count: plan.size },
  });
  if (auditError) {
    console.error("[routeReport] log_audit failed", auditError.code, auditError.message);
    return incomplete("the routing couldn't be recorded in the audit trail");
  }

  // e. Guarded on the current status so a concurrent route can't be
  // overwritten.
  const { data: updated, error: statusError } = await supabase
    .from("incident_reports")
    .update({ status: "routed" })
    .eq("id", reportId)
    .eq("status", "validated")
    .select("id");

  if (statusError) {
    console.error("[routeReport] status update failed", statusError.code, statusError.message);
    return incomplete("its status couldn't be updated");
  }

  // Zero rows back is ambiguous, and the difference matters: either another
  // official moved it first (fine — it's routed), or RLS filtered the UPDATE
  // out, which Postgres does silently, with no error. Only a re-read tells
  // them apart; assuming success here would report a routing that never
  // finished.
  if (!updated || updated.length === 0) {
    const { data: now } = await supabase
      .from("incident_reports")
      .select("status")
      .eq("id", reportId)
      .maybeSingle();
    if (now?.status !== "routed" && now?.status !== "resolved") {
      return incomplete("its status couldn't be updated");
    }
  }

  revalidatePath("/queue");
  return { success: true, agencyCount: plan.size };
}

function routingRow(reportId: string, agencyId: string, isPrimary: boolean) {
  // Only these four columns are insert-grantable, and ar_insert_barangay
  // requires auto_routed = false: a barangay can only route by hand.
  return { incident_report_id: reportId, agency_id: agencyId, is_primary: isPrimary, auto_routed: false };
}

/** The agencies that already hold this report, or null if the read failed. */
async function routedAgencyIds(
  supabase: ReturnType<typeof createClient>,
  reportId: string
): Promise<Set<string> | null> {
  const { data, error } = await supabase
    .from("agency_routing")
    .select("agency_id")
    .eq("incident_report_id", reportId);
  if (error) {
    console.error("[routeReport] existing read failed", error.code, error.message);
    return null;
  }
  return new Set((data ?? []).map((row) => row.agency_id as string));
}

/**
 * Recovery after a multi-row insert lost a race. Returns true only once a
 * re-read proves every planned agency holds the report — the audit and status
 * steps must not run on an assumption.
 */
async function insertRemainingIndividually(
  supabase: ReturnType<typeof createClient>,
  reportId: string,
  plan: Map<string, boolean>
): Promise<boolean> {
  const present = await routedAgencyIds(supabase, reportId);
  if (present === null) return false;

  for (const [agencyId, isPrimary] of plan) {
    if (present.has(agencyId)) continue;
    const { error } = await supabase.from("agency_routing").insert(routingRow(reportId, agencyId, isPrimary));
    if (error && error.code !== "23505") {
      console.error("[routeReport] recovery insert failed", error.code, error.message);
      return false;
    }
  }

  const after = await routedAgencyIds(supabase, reportId);
  return after !== null && [...plan.keys()].every((agencyId) => after.has(agencyId));
}

export interface BulkValidateResult {
  validated: number;
  failures: { reportId: string; message: string }[];
}

/**
 * Validates every report in a duplicate cluster, one review_report() call per
 * member.
 *
 * There is no bulk RPC and no transaction spanning the set, so this is not
 * all-or-nothing: some members can succeed while others fail, most often with
 * 55000 because another official reviewed one of them first. The caller gets
 * both counts and must say so — reporting a partial run as success is exactly
 * the failure this button had before it did any work at all.
 *
 * Sequential rather than Promise.all: these are writes against the same
 * cluster, and a failure part-way through shouldn't leave the rest in flight.
 * A transport failure (no network, no session) stops the loop: every remaining
 * member would fail the same way, so they're reported with that one message
 * rather than tried and failed one by one.
 */
export async function validateReports(reportIds: string[]): Promise<BulkValidateResult> {
  // Proven before any work: a short array of uuids, de-duplicated. Rejected as
  // one failure, not one per element — the input may be enormous, and
  // reflecting it back would make the response as large as the request.
  if (
    !Array.isArray(reportIds) ||
    reportIds.length === 0 ||
    reportIds.length > MAX_BULK ||
    !reportIds.every(isUuid)
  ) {
    return { validated: 0, failures: [{ reportId: "", message: INVALID_REQUEST }] };
  }
  const ids = [...new Set(reportIds.map((id) => id.toLowerCase()))];

  const supabase = createClient();
  const failures: BulkValidateResult["failures"] = [];
  let validated = 0;

  for (let index = 0; index < ids.length; index++) {
    const reportId = ids[index];
    const { error, status } = await supabase.rpc("review_report", {
      p_report_id: reportId,
      p_decision: "validated",
      p_reason: null,
    });

    if (!error) {
      validated += 1;
      continue;
    }

    const transport = transportMessage(status, error);
    if (transport) {
      for (const remaining of ids.slice(index)) failures.push({ reportId: remaining, message: transport });
      break;
    }
    failures.push({ reportId, message: messageForReviewError(error) });
  }

  if (validated > 0) revalidatePath("/queue");
  return { validated, failures };
}
