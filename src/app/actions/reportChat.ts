"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REPORT_CHAT_LIVE, REPORT_CHAT_V2 } from "@/lib/features";
import { isUuid } from "@/lib/utils";
import {
  MAX_MESSAGE_LENGTH,
  toAgencyGroupAccess,
  type AgencyGroupAccess,
  type ChatLock,
  type ChatThread,
  type SendOutcome,
} from "@/lib/reportChat";

/*
 * The report chat's writes, the lock-time read, and (v2) the agencies'
 * access read.
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
  return sendRefusalOutcome("send_report_message", reportId, status, error);
}

/**
 * What a refused send means, read from the code and the token in the
 * error's details, never from the message text. Both send functions refuse
 * the same way (the v2 contract's refusal table keeps v1's codes and
 * tokens), so v1 and the desk thread word a refusal alike. `fn` only names
 * the function in the server log.
 */
function sendRefusalOutcome(
  fn: string,
  reportId: string,
  status: number,
  error: { code?: string; details?: string | null; message?: string }
): SendOutcome {
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
    console.error(`[${fn}] 55000 with an unknown token`, JSON.stringify({ report: reportId, token }));
    return "not-accepting";
  }
  if (error.code === "42501") {
    // One answer for a missing report and another barangay's, on purpose:
    // it can't be used to learn that a report exists.
    return token.includes("no_barangay") ? "no-barangay" : "refused";
  }

  console.error(
    `[${fn}] not sent`,
    JSON.stringify({ report: reportId, status, code: error.code, message: error.message })
  );
  return "failed";
}

/**
 * Sends one message on the report's desk thread (REPORT_CHAT_V2): the
 * staff-only thread between the barangay desk and the agencies the report
 * is routed to. The resident never reads it.
 *
 * send_report_chat_message(p_report_id, p_thread, p_body) is the v2 send
 * (the backend's docs/specs/2026-10-08-report-chat-v2-design.md, section
 * 4). The group thread keeps sendReportMessage above: for a desk role the
 * v2 function only calls the v1 one there, with v1's row, audit entry,
 * notification and refusals. Its refusals on the desk thread use the same
 * codes and tokens, so they are worded the same.
 */
export async function sendDeskMessage(reportId: string, body: string): Promise<SendOutcome> {
  if (!REPORT_CHAT_LIVE || !REPORT_CHAT_V2) return "off";
  const trimmed = typeof body === "string" ? body.trim() : "";
  if (!isUuid(reportId) || trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
    return "invalid";
  }

  const supabase = createClient();
  const { error, status } = await supabase.rpc("send_report_chat_message", {
    p_report_id: reportId,
    p_thread: "desk",
    p_body: trimmed,
  });

  if (!error) return "sent";
  return sendRefusalOutcome("send_report_chat_message", reportId, status, error);
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
 * Records that the desk has a thread of this report on screen
 * (REPORT_CHAT_V2): mark_report_chat_seen(p_report_id, p_thread) creates
 * the desk's seen marker the first time ("opened") and moves it to the
 * newest message after that. A call that would not move it writes nothing,
 * so it is safe to repeat. On the group thread it also runs v1's
 * mark_report_messages_read(), so the reporter's messages get their read_at
 * as before.
 *
 * `hadUnread` is the drawer's word that the reporter had unread messages
 * on screen: only then can the queue row's [New message] mark change, and
 * only then is the queue re-rendered for it, as markReportMessagesRead
 * does on a count above 0. The function returns a time, not a count.
 *
 * The answer is only whether it was done; a failure is logged here, as
 * markReportMessagesRead's is.
 */
export async function markReportChatSeen(reportId: string, thread: ChatThread, hadUnread: boolean): Promise<boolean> {
  if (!REPORT_CHAT_LIVE || !REPORT_CHAT_V2 || !isUuid(reportId)) return false;
  if (thread !== "group" && thread !== "desk") return false;

  const supabase = createClient();
  const { error, status } = await supabase.rpc("mark_report_chat_seen", {
    p_report_id: reportId,
    p_thread: thread,
  });

  if (error) {
    console.error(
      "[mark_report_chat_seen] not marked",
      JSON.stringify({ report: reportId, thread, status, code: error.code, token: error.details ?? null })
    );
    return false;
  }

  if (thread === "group" && hadUnread === true) revalidatePath("/queue");
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

/**
 * Whether the agencies can read this report's group thread yet
 * (REPORT_CHAT_V2), from report_chat_access(p_report_id), so the desk can
 * be told why no agency is in it. The backend shows an agency the group
 * thread only after the reporter accepts the consent notice that covers
 * agency chat (its consent gate). The desk's own reading and writing are
 * not gated.
 *
 * Any failure answers "unknown" and the drawer then says nothing: this is a
 * hint, never a reason to hold back the thread or the composer.
 */
export async function getAgencyGroupAccess(reportId: string): Promise<AgencyGroupAccess> {
  if (!REPORT_CHAT_LIVE || !REPORT_CHAT_V2 || !isUuid(reportId)) return "unknown";

  const supabase = createClient();
  const { data, error, status } = await supabase.rpc("report_chat_access", {
    p_report_id: reportId,
  });

  if (error) {
    console.error(
      "[report_chat_access] not read",
      JSON.stringify({ report: reportId, status, code: error.code, token: error.details ?? null })
    );
    return "unknown";
  }
  return toAgencyGroupAccess(data);
}
