"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpdateResult {
  success: boolean;
  message?: string;
}

// Same wording as profile.ts, so an expired session reads the same
// everywhere it can surface.
const SESSION_EXPIRED = "Your session expired. Sign in again.";

/**
 * Whether the caller still has a session. Checked before calling
 * review_report(): without this, an expired cookie made the RPC run
 * unauthenticated and fail with 42501, which messageForReviewError() rightly
 * translates to [wrong barangay, or already past review] — telling the
 * official their report had been taken by someone else when they had simply
 * been signed out. The check is about the message, not security; RLS still
 * decides what the RPC may do.
 */
async function hasSession(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user !== null;
}

/**
 * THE CUTOVER — review_report() is now the ONLY path to validate/reject a
 * report. As of the 2026-08-31 db push, prod's incident_reports_review_
 * stamped CHECK constraint means a raw update({ status: 'validated' |
 * 'rejected' }) fails with 23514 — there is no fallback, and none should
 * be added back. Same function name/signature as before this swap
 * (updateReportStatus(reportId, status, reason)), so ReportRow.tsx and the
 * ReasonPromptModal flow needed ZERO changes for this cutover — only this
 * function's internals changed.
 *
 * RLS scopes what review_report() is allowed to do (own-barangay for
 * barangay roles, city-wide for municipal_admin) — this function doesn't
 * re-check that itself.
 */
export async function updateReportStatus(
  reportId: string,
  status: "validated" | "rejected",
  reason?: string
): Promise<UpdateResult> {
  const supabase = createClient();

  if (status === "rejected" && (!reason || reason.trim() === "")) {
    return { success: false, message: "A reason is required to reject a report." };
  }

  if (!(await hasSession(supabase))) {
    return { success: false, message: SESSION_EXPIRED };
  }

  const { error } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_decision: status,
    p_reason: reason ?? null,
  });

  if (error) {
    return { success: false, message: messageForReviewError(error) };
  }

  revalidatePath("/queue");
  return { success: true };
}

/**
 * Maps review_report()'s SQLSTATEs to something an official can act on.
 * Extracted so the bulk path below reports failures identically to the
 * single-report path — behaviour is unchanged from when this lived inline.
 */
function messageForReviewError(error: { code?: string; message: string }): string {
  // 22023: bad decision value, or missing/empty reason on reject (the RPC
  // enforces this server-side too, not just our client-side check above).
  if (error.code === "22023") return error.message;
  // 42501: not authorized — wrong role, wrong barangay, report not found,
  // or it already left the pending_priority/prioritized window.
  if (error.code === "42501") {
    return "Not permitted — wrong barangay, or already past review.";
  }
  // 55000: terminal-state conflict — someone else reviewed this report
  // between when the queue loaded and when this action fired.
  if (error.code === "55000") return "Someone else already reviewed this report.";
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
  const supabase = createClient();

  if (!(await hasSession(supabase))) {
    return { success: false, message: SESSION_EXPIRED };
  }

  // a.
  const { data: report, error: reportError } = await supabase
    .from("incident_reports")
    .select("id, category, status")
    .eq("id", reportId)
    .maybeSingle();

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
  if (!mapping || mapping.length === 0) {
    return {
      success: false,
      message: "No agency is mapped to this category — it needs barangay review.",
    };
  }

  // c. Only the agencies not already routed. A second click, a retry after
  // a partial run, or another official routing at the same moment must not
  // produce a second row per agency.
  const { data: existing, error: existingError } = await supabase
    .from("agency_routing")
    .select("agency_id")
    .eq("incident_report_id", reportId);

  if (existingError) {
    console.error("[routeReport] existing read failed", existingError.code, existingError.message);
    return { success: false, message: ROUTE_FAILED };
  }

  const alreadyRouted = new Set((existing ?? []).map((row) => row.agency_id as string));
  const rows = mapping
    .filter((m) => !alreadyRouted.has(m.agency_id))
    .map((m) => ({
      incident_report_id: reportId,
      agency_id: m.agency_id,
      is_primary: m.is_primary,
      // Required false by ar_insert_barangay: a barangay can only route by
      // hand. Only these four columns are insert-grantable.
      auto_routed: false,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("agency_routing").insert(rows);
    // 23505 would mean a unique constraint caught a concurrent insert of the
    // same agency — the row exists, which is the outcome wanted.
    if (insertError && insertError.code !== "23505") {
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
    p_metadata: { agency_count: mapping.length },
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
  return { success: true, agencyCount: mapping.length };
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
 */
export async function validateReports(reportIds: string[]): Promise<BulkValidateResult> {
  const supabase = createClient();
  const failures: BulkValidateResult["failures"] = [];
  let validated = 0;

  // One check for the whole set, not one per member: every member would
  // fail for the same reason, and the toast shows failures[0].message.
  if (!(await hasSession(supabase))) {
    return {
      validated: 0,
      failures: reportIds.map((reportId) => ({ reportId, message: SESSION_EXPIRED })),
    };
  }

  for (const reportId of reportIds) {
    const { error } = await supabase.rpc("review_report", {
      p_report_id: reportId,
      p_decision: "validated",
      p_reason: null,
    });

    if (error) {
      failures.push({ reportId, message: messageForReviewError(error) });
    } else {
      validated += 1;
    }
  }

  if (validated > 0) revalidatePath("/queue");
  return { validated, failures };
}