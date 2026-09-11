"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Records that this official opened a report.
 *
 * This is Data Privacy Act access logging, not analytics. The detail drawer
 * shows the reporter's own account of the incident, and the system is
 * required to record who looked at it — that trail is the whole reason
 * audit_logs carries actor_id, report_id, and subject_user_id together.
 *
 * The console cannot write audit_logs itself: there is no INSERT policy for
 * any barangay role, only audit_all_municipal. log_report_view() is the
 * backend's answer to that. It runs SECURITY INVOKER, so whether this
 * official may see the report is decided by the same RLS that scopes the
 * queue, and it stamps subject_user_id by looking up the report's user_id
 * itself — the caller never supplies a subject, and there is no purpose code
 * (those belong to the oversight-only identity-reveal vocabulary, not to a
 * routine desk view).
 *
 * Deliberately not debounced. Duplicate rows are acceptable to the backend;
 * missing rows are not. React StrictMode double-invoking the caller's effect
 * in dev writes two rows, and that is the correct trade.
 *
 * Fails silently on purpose, and this is the one place in the console where
 * that is right: an official must never be blocked from reading a report
 * because the logger is down, and there is no action they could take on the
 * error anyway. The gap that matters is on the backend's side — a missing
 * row is invisible here by design.
 */
export async function logReportView(reportId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("log_report_view", {
    p_report_id: reportId,
  });

  if (!error) return;

  // PGRST202: the function isn't in PostgREST's schema cache — it hasn't been
  // pushed to this project yet. Expected until the migration lands, so it is
  // not worth a log line on every drawer open.
  //
  // 42501: the report was not found OR is outside this official's scope. The
  // backend returns one code for both on purpose, so the error can't be used
  // to probe another barangay's report ids — and per the backend owner
  // (2026-09-11) it is [not ours], not a bug: key on the code, never on the
  // message text, and don't log it.
  if (error.code === "PGRST202" || error.code === "42501") return;

  console.error(`log_report_view failed for ${reportId}: ${error.code} ${error.message}`);
}
