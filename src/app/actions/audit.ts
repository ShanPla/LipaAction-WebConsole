"use server";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";

/**
 * How a view-log attempt ended. The caller decides what to show; nothing here
 * is hidden.
 */
export type ViewLogOutcome = "logged" | "session-expired" | "refused" | "failed";

/**
 * Records that this official opened a report.
 *
 * This is Data Privacy Act access logging, not analytics. The detail drawer
 * shows the reporter's own account of the incident, and the system is
 * required to record who looked at it — that trail is the whole reason
 * audit_logs carries actor_id, report_id, and subject_user_id together.
 *
 * The console cannot write audit_logs itself: there is no INSERT policy for
 * any barangay role. log_report_view() is the backend's answer, live on prod
 * since 2026-09-16. It runs SECURITY INVOKER, so whether this official may
 * see the report is decided by the same RLS that scopes the queue, and it
 * stamps subject_user_id by looking up the report's user_id itself — the
 * caller never supplies a subject, and there is no purpose code (those belong
 * to the oversight-only identity-reveal vocabulary, not to a routine desk
 * view). Never call log_audit('report_viewed', …) instead: it trusts whatever
 * report_id and subject_user_id its caller passes.
 *
 * **Every call appends a row.** The function is not idempotent, so the caller
 * must fire it once per report opened — see ReportDetailPanel's guard against
 * React re-running the effect. A trail full of duplicate views is as useless
 * as one with gaps.
 *
 * Failures never block the read: an official must not be locked out of a
 * report because the logger is down. They are not swallowed either — a silent
 * miss in an access trail is worse than a visible one — so each maps to an
 * outcome the drawer reports.
 */
export async function logReportView(reportId: string): Promise<ViewLogOutcome> {
  // Shape first. This is a public endpoint: without the check, anything a
  // caller sent — up to the 1 MB body limit, newlines included — was passed to
  // the RPC and then interpolated into the server log, twice for 22P02, since
  // Postgres echoes the input inside its own message.
  if (!isUuid(reportId)) return "failed";

  const supabase = createClient();

  const { error, status } = await supabase.rpc("log_report_view", {
    p_report_id: reportId,
  });

  if (!error) return "logged";

  // Branch on the code, never the message text: the backend deliberately
  // returns one message for "outside your scope" and "no such report", so the
  // error can't be used to probe another barangay's report ids.
  //
  // 42501 with 401 means no session reached PostgREST and the request fell
  // back to the anon key — an authentication problem, not a scope one.
  const outcome: ViewLogOutcome =
    error.code === "42501" ? (status === 401 ? "session-expired" : "refused") : "failed";

  // Structured fields only, never error.message: a missed access-log entry
  // must be findable in the host's logs, and the message can carry the
  // caller's input back in.
  console.error("[log_report_view] not logged", JSON.stringify({ outcome, report: reportId, status, code: error.code }));
  return outcome;
}
