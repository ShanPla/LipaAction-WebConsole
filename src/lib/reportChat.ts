/**
 * What the report chat's client and server halves share: its limits, the
 * shape of a message, and the answers its actions give. Constants live
 * here, not in the actions file, because a "use server" file may export
 * only async functions.
 *
 * The chat is the text thread between a report's reporter and the desk of
 * the report's barangay. The backend owns every rule (who may read, who may
 * write, the length, the rate, no thread on a discreet report); this
 * console only shows the thread and words the refusals.
 */

/** The backend stores a message trimmed, at 1 to this many characters. */
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * The six columns a client may read, named one by one. report_messages has
 * a column grant, not a table grant: sender_id is not readable, and a
 * select of every column is refused with 42501. Never widen this.
 */
export const MESSAGE_COLUMNS = "id, report_id, sender_side, body, created_at, read_at";

/** The newest messages the drawer loads; a longer thread says it is cut. */
export const THREAD_LIMIT = 200;

/**
 * The v2 columns (REPORT_CHAT_V2): the v1 six plus agency_id, which names
 * the agency of an [agency] message. The desk thread has no read_at; the
 * seen markers replace it. Never widen either: sender_id is not readable.
 */
export const GROUP_MESSAGE_COLUMNS_V2 = "id, report_id, sender_side, agency_id, body, created_at, read_at";
export const DESK_MESSAGE_COLUMNS_V2 = "id, report_id, sender_side, agency_id, body, created_at";

/**
 * The report's two threads under v2. [group] is the v1 thread
 * (report_messages) with the routed agencies added; [desk] is the
 * staff-only thread (report_desk_messages) the resident never reads.
 */
export type ChatThread = "group" | "desk";

/** The table each thread is stored in. */
export const THREAD_TABLE: Record<ChatThread, string> = {
  group: "report_messages",
  desk: "report_desk_messages",
};

// [agency] arrives only under v2; the v1 reader never returns it.
export type MessageSide = "resident" | "barangay" | "agency";

export interface ChatMessage {
  id: string;
  reportId: string;
  // Decided by the backend from the sender's role. The desk writes as
  // [barangay]; which official wrote is not readable by any client.
  side: MessageSide;
  // The agency that wrote an [agency] message; null on every other side.
  agencyId: string | null;
  body: string;
  createdAt: string;
  // Set when the other side opened the thread; null until then, and always
  // null on the desk thread, which has no such column.
  readAt: string | null;
}

/**
 * One row, from a select or from a Realtime payload, as a message. null for
 * anything that isn't a whole message: a Realtime DELETE carries only the
 * id, and nothing half-shaped should be drawn as a bubble.
 */
export function toChatMessage(row: unknown): ChatMessage | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.report_id !== "string") return null;
  if (r.sender_side !== "resident" && r.sender_side !== "barangay") return null;
  if (typeof r.body !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    reportId: r.report_id,
    side: r.sender_side,
    agencyId: null,
    body: r.body,
    createdAt: r.created_at,
    readAt: typeof r.read_at === "string" ? r.read_at : null,
  };
}

/**
 * The v2 reader, for either thread: as toChatMessage, and it also keeps an
 * [agency] message, which must name its agency (the backend's CHECK
 * guarantees one; a row without it is not drawn). A side this console
 * doesn't know is still dropped.
 */
export function toChatMessageV2(row: unknown): ChatMessage | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (r.sender_side !== "agency") {
    const v1 = toChatMessage(row);
    return v1 === null ? null : { ...v1, agencyId: null };
  }
  if (typeof r.id !== "string" || typeof r.report_id !== "string") return null;
  if (typeof r.agency_id !== "string") return null;
  if (typeof r.body !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    reportId: r.report_id,
    side: "agency",
    agencyId: r.agency_id,
    body: r.body,
    createdAt: r.created_at,
    readAt: typeof r.read_at === "string" ? r.read_at : null,
  };
}

/** Oldest first, then by id: the order the backend's contract reads a thread in. */
export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)
  );
}

/**
 * How a send ended. A code, not a sentence, as in writeOutcome.ts: the
 * drawer words it in the official's language.
 *
 * - discreet: the report is discreet, which has no thread at all.
 * - closed: the thread no longer takes messages. The backend is adding
 *   this (a thread becomes read-only 3 days after its report is closed).
 * - not-accepting: a 55000 this console doesn't know by its token.
 */
export type SendOutcome =
  | "sent"
  | "invalid"
  | "discreet"
  | "closed"
  | "rate-limited"
  | "daily-cap"
  | "not-accepting"
  | "refused"
  | "no-barangay"
  | "session-expired"
  | "unreachable"
  | "off"
  | "failed";

/**
 * When a report's chat becomes read-only (report_chat_locks_at).
 *
 * - open: the report is still open; no lock time yet.
 * - locks: it closes at `at` (ISO), 3 days after the report was closed.
 * - locked: that time has passed.
 * - unknown: the read failed; the send's own refusal decides.
 */
export type ChatLock =
  | { kind: "open" }
  | { kind: "locks"; at: string }
  | { kind: "locked" }
  | { kind: "unknown" };

/**
 * Whether the agencies a report is routed to take part in its group thread
 * (REPORT_CHAT_V2): report_chat_access()'s agency_group_access, the
 * backend's consent gate. An agency reads and writes the group thread only
 * once the reporter has accepted the consent notice that covers agency
 * chat; until then the agencies have the desk thread only.
 *
 * - open: the agencies read the group thread, earlier messages included.
 * - consent-pending: the reporter hasn't accepted that notice yet.
 * - none: nothing to wait for (a discreet report has no thread).
 * - unknown: the read failed, or the answer was none of the above.
 */
export type AgencyGroupAccess = "open" | "consent-pending" | "none" | "unknown";

/** Reads agency_group_access from report_chat_access()'s jsonb answer. */
export function toAgencyGroupAccess(data: unknown): AgencyGroupAccess {
  if (typeof data !== "object" || data === null || !("agency_group_access" in data)) return "unknown";
  const value = (data as { agency_group_access: unknown }).agency_group_access;
  if (value === "open") return "open";
  if (value === "consent_pending") return "consent-pending";
  if (value === null) return "none";
  return "unknown";
}

/**
 * Whether a report offers the chat at all: the backend has it (the
 * REPORT_CHAT_LIVE flag, passed in) and the report is not discreet, which
 * has no thread. The drawer and the queue row's [Chat] button both ask this,
 * so they can never disagree.
 */
export function isChatOffered(live: boolean, discreetReporting: boolean): boolean {
  return live && !discreetReporting;
}
