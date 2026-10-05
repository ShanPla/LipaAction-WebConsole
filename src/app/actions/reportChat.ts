"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REPORT_CHAT_LIVE } from "@/lib/features";
import { categoryLabel, isUuid } from "@/lib/utils";
import {
  MAX_MESSAGE_LENGTH,
  PREVIOUS_REPORT_LIMIT,
  type PreviousReport,
  type ReporterContext,
  type SendOutcome,
} from "@/lib/reportChat";

/*
 * The report chat's writes, and the one read that must stay on the server.
 *
 * Every function here is a public POST endpoint, as in reports.ts: each
 * proves the shape of its input before any call, and each refuses before
 * any read while REPORT_CHAT_LIVE is false.
 *
 * The backend's contract (its docs/specs/2026-10-06-report-chat-design.md):
 * send_report_message(p_report_id, p_body) is the only way to write a
 * message, and it decides the side from the caller's role; a desk role
 * writes as [barangay] and must belong to the report's barangay. Its
 * refusals carry a stable token in the error's details, and the answer is
 * chosen by code and token, never by the message text.
 */

/**
 * What a failed call means before any business meaning is read into it, the
 * same two readings reports.ts makes: no HTTP answer is a network failure,
 * and a 401 (or a PGRST30x) means no usable session reached PostgREST.
 */
function transportOutcome(status: number, error: { code?: string }): "unreachable" | "session-expired" | null {
  if (status === 0) return "unreachable";
  if (status === 401 || (error.code ?? "").startsWith("PGRST30")) return "session-expired";
  return null;
}

/**
 * Sends one message from the desk to a report's reporter.
 *
 * The length is checked here so the official gets a specific answer, and
 * because this is a public endpoint whatever the composer allows; the
 * function checks it again and stores the text trimmed.
 *
 * 55000 is the function's answer for a thread that can't take a message:
 * a discreet report (no thread at all), too many messages in ten minutes,
 * and, with a change the backend owner has announced, a thread that closed
 * 3 days after its report was closed. That last token isn't fixed yet, so
 * any token naming [closed] reads as closed, and a 55000 with a token this
 * console doesn't know is reported as not accepting messages rather than
 * as a failure.
 */
export async function sendReportMessage(reportId: string, body: string): Promise<SendOutcome> {
  if (!REPORT_CHAT_LIVE) return "off";
  // typeof first: a caller can send a number or an object, and `.trim()` on
  // either would throw inside the action instead of answering.
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!isUuid(reportId) || trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
    return "invalid";
  }

  const supabase = createClient();
  const { error, status } = await supabase.rpc("send_report_message", {
    p_report_id: reportId,
    p_body: trimmed,
  });

  if (!error) return "sent";

  const transport = transportOutcome(status, error);
  if (transport) return transport;

  const token = error.details ?? "";
  if (error.code === "22023") return "invalid";
  if (error.code === "55000") {
    if (token.includes("discreet")) return "discreet";
    if (token.includes("rate_limited")) return "rate-limited";
    if (token.includes("closed")) return "closed";
    // Codes and ids only, never the message: it is authored in another repo.
    console.error("[send_report_message] 55000 with an unknown token", JSON.stringify({ report: reportId, token }));
    return "not-accepting";
  }
  if (error.code === "42501") {
    // One answer for a missing report and another barangay's, on purpose:
    // it can't be used to learn that a report exists.
    return token.includes("no_barangay") ? "no-barangay" : "refused";
  }

  console.error(
    "[send_report_message] not sent",
    JSON.stringify({ report: reportId, status, code: error.code, message: error.message })
  );
  return "failed";
}

/**
 * Marks the reporter's messages on a report as read by the desk, when an
 * official opens the thread. mark_report_messages_read() sets read_at on
 * the other side's unread messages and returns how many; on a discreet
 * report it returns 0.
 *
 * The answer is only whether it was done. A failure costs a [New message]
 * mark that stays on the queue row until the next opening, so it is logged
 * here and not put in front of the official.
 */
export async function markReportMessagesRead(reportId: string): Promise<boolean> {
  if (!REPORT_CHAT_LIVE || !isUuid(reportId)) return false;

  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("mark_report_messages_read", {
    p_report_id: reportId,
  });

  if (error) {
    console.error(
      "[mark_report_messages_read] not marked",
      JSON.stringify({ report: reportId, status, code: error.code })
    );
    return false;
  }

  // The queue row's [New message] mark is read from the same column.
  if (typeof data === "number" && data > 0) revalidatePath("/queue");
  return true;
}

/**
 * What the drawer's Reporter section shows: the reporter's home barangay
 * and trust score, and their earlier reports in this barangay.
 *
 * On the server, not in the browser, for one reason: it needs the report's
 * user_id to find the profile and the earlier reports, and that id must not
 * reach the page. The desk's role can read it (incident_reports has a
 * table-level grant), but no screen of this console carries it.
 *
 * A report filed with identity withheld stops at the first read. Nothing
 * about its reporter is looked up, and a missing flag counts as withheld,
 * as on the map.
 *
 * Everything is read under the official's own session, and nothing here
 * asks for more than row-level security already gives:
 *  - the profile is readable only when the reporter is registered in the
 *    official's barangay (profiles_select_barangay). When it isn't, the
 *    section says so. The name and the phone number are never selected.
 *  - the earlier reports are the ones filed in the same barangay as this
 *    report, which is the desk's own (ir_select_barangay). Reports the
 *    resident filed with identity withheld are left out of the list:
 *    listing them here would tie them to this reporter.
 */
export async function getReporterContext(reportId: string): Promise<ReporterContext> {
  if (!REPORT_CHAT_LIVE || !isUuid(reportId)) return { kind: "unavailable" };

  const supabase = createClient();
  const { data: report, error: reportError } = await supabase
    .from("incident_reports")
    .select("id, user_id, identity_withheld, incident_barangay_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    console.error("[reporterContext] report read failed", reportError.code, reportError.message);
    return { kind: "unavailable" };
  }
  if (!report) return { kind: "unavailable" };
  if (report.identity_withheld !== false) return { kind: "withheld" };
  if (!isUuid(report.user_id) || !isUuid(report.incident_barangay_id)) return { kind: "unavailable" };

  const [profileRes, previousRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("trust_score, barangays ( name )")
      .eq("id", report.user_id)
      // profiles holds officials too.
      .eq("role", "resident")
      .maybeSingle(),
    supabase
      .from("incident_reports")
      .select("id, category, status, created_at")
      .eq("user_id", report.user_id)
      .eq("incident_barangay_id", report.incident_barangay_id)
      .eq("identity_withheld", false)
      .neq("id", reportId)
      .order("created_at", { ascending: false })
      // One more than is shown: the only way to know more exist.
      .limit(PREVIOUS_REPORT_LIMIT + 1),
  ]);

  if (profileRes.error) {
    console.error("[reporterContext] profile read failed", profileRes.error.code, profileRes.error.message);
  }
  if (previousRes.error) {
    console.error("[reporterContext] earlier reports failed", previousRes.error.code, previousRes.error.message);
  }

  const rawProfile = profileRes.error
    ? null
    : (profileRes.data as {
        trust_score: number | string | null;
        barangays: { name: string } | { name: string }[] | null;
      } | null);

  const rawPrevious = previousRes.error
    ? null
    : ((previousRes.data ?? []) as { id: string; category: string; status: string; created_at: string }[]);

  return {
    kind: "reporter",
    profile: rawProfile
      ? { homeBarangay: barangayName(rawProfile.barangays), trustScore: toScore(rawProfile.trust_score) }
      : null,
    previous: rawPrevious
      ? rawPrevious.slice(0, PREVIOUS_REPORT_LIMIT).map(
          (r): PreviousReport => ({
            id: r.id,
            category: categoryLabel(r.category),
            status: r.status,
            submittedAt: r.created_at,
          })
        )
      : null,
    previousCapped: rawPrevious !== null && rawPrevious.length > PREVIOUS_REPORT_LIMIT,
  };
}

// Supabase's join comes back as an array even for a to-one relationship
// unless the FK is marked unique (see requireBarangayOfficial).
function barangayName(joined: { name: string } | { name: string }[] | null): string | null {
  const name = Array.isArray(joined) ? joined[0]?.name : joined?.name;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
}

// PostgREST returns a numeric column as a number or as a string.
function toScore(value: number | string | null): number | null {
  if (value === null) return null;
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : null;
}
