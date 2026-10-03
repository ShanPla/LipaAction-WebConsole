"use server";

import { createClient } from "@/lib/supabase/server";
import { DATA_EXPORTED, isExportKind, MAX_EXPORT_ROWS, type ExportRecordOutcome } from "@/lib/exports";
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

/**
 * Records that the signed-in official is exporting data: a CSV file, or a
 * print that the browser can save as a PDF.
 *
 * The thesis's access trail covers every read and export of personal
 * information (FR-22, report #34). An export is the moment data leaves the
 * console for a file nobody can log again, so it is recorded first, and the
 * caller goes ahead only on `recorded`: unlike a report drawer, which stays
 * open when its view can't be logged because a desk must not be locked out
 * of an emergency, an export can wait.
 *
 * Written through log_audit as `data_exported`, with no report id and with
 * metadata of exactly { what, rows }, which is the shape the backend accepts.
 * `what` must be one of the console's own export names, since this is a
 * public endpoint and the trail should not hold whatever a caller sent.
 *
 * The record says an export was started from this account. It cannot say
 * what was then done with the file, and printing through the browser's own
 * menu instead of the console's button bypasses it.
 */
export async function recordExport(what: string, rows: number): Promise<ExportRecordOutcome> {
  if (!isExportKind(what) || !Number.isInteger(rows) || rows < 0 || rows > MAX_EXPORT_ROWS) return "invalid";

  const supabase = createClient();
  const { error, status } = await supabase.rpc("log_audit", {
    p_action: DATA_EXPORTED,
    p_report_id: null,
    p_metadata: { what, rows },
  });

  if (!error) return "recorded";

  // The same reading as everywhere: no HTTP answer is the network, a 401 or
  // a PGRST30x is the session, 42501 is this role refused. Anything else,
  // including an action name the backend doesn't recognise, is a failure.
  const outcome: ExportRecordOutcome =
    status === 0
      ? "unreachable"
      : status === 401 || (error.code ?? "").startsWith("PGRST30")
        ? "session-expired"
        : error.code === "42501"
          ? "refused"
          : "failed";

  // Structured fields only, never error.message.
  console.error("[data_exported] not recorded", JSON.stringify({ outcome, what, rows, status, code: error.code }));
  return outcome;
}
