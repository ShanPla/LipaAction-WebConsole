"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REPORT_CHAT_LIVE } from "@/lib/features";
import { isUuid } from "@/lib/utils";
import {
  MAX_MESSAGE_LENGTH,
  type ChatLock,
  type SendOutcome,
} from "@/lib/reportChat";

/*
 * The report chat's writes, and the lock-time read.
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
 * 100 messages on the report in 24 hours (daily_cap),
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
    if (token.includes("daily_cap")) return "daily-cap";
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
 * When a report's chat becomes read-only, so the drawer can lock the
 * composer up front and show the date, instead of learning it from a
 * refused send. report_chat_locks_at() returns NULL while the report is
 * open, and a timestamp (3 days after it was closed) otherwise; a time in
 * the past means the chat is already read-only.
 *
 * Any failure answers "unknown": the composer stays usable and the send's
 * own refusal still decides, so this read can never block a message the
 * backend would accept.
 */
export async function getChatLock(reportId: string): Promise<ChatLock> {
  if (!REPORT_CHAT_LIVE || !isUuid(reportId)) return { kind: "unknown" };

  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("report_chat_locks_at", {
    p_report_id: reportId,
  });

  if (error) {
    console.error(
      "[report_chat_locks_at] not read",
      JSON.stringify({ report: reportId, status, code: error.code })
    );
    return { kind: "unknown" };
  }
  if (data === null || data === undefined) return { kind: "open" };
  if (typeof data !== "string") return { kind: "unknown" };
  const at = new Date(data).getTime();
  if (!Number.isFinite(at)) return { kind: "unknown" };
  return at <= Date.now() ? { kind: "locked" } : { kind: "locks", at: new Date(at).toISOString() };
}
