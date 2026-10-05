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

export type MessageSide = "resident" | "barangay";

export interface ChatMessage {
  id: string;
  reportId: string;
  // Decided by the backend from the sender's role. The desk writes as
  // [barangay]; which official wrote is not readable by any client.
  side: MessageSide;
  body: string;
  createdAt: string;
  // Set when the other side opened the thread; null until then.
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
  | "not-accepting"
  | "refused"
  | "no-barangay"
  | "session-expired"
  | "unreachable"
  | "off"
  | "failed";

/** One of the reporter's earlier reports, as the Reporter section lists it. */
export interface PreviousReport {
  id: string;
  // Display form, as on a queue row.
  category: string;
  status: string;
  submittedAt: string;
}

export const PREVIOUS_REPORT_LIMIT = 10;

/**
 * What the drawer may show about who filed a report.
 *
 * - withheld: filed with identity withheld. Nothing about the reporter is
 *   read for these, so nothing can be shown by mistake.
 * - unavailable: the read failed, or the chat isn't switched on.
 * - reporter: profile is null when this desk can't read it (row-level
 *   security lets a desk read only residents registered in its own
 *   barangay); previous is null when the list couldn't be read.
 *
 * Never a name, a phone number or the reporter's account id.
 */
export type ReporterContext =
  | { kind: "withheld" }
  | { kind: "unavailable" }
  | {
      kind: "reporter";
      profile: { homeBarangay: string | null; trustScore: number | null } | null;
      previous: PreviousReport[] | null;
      previousCapped: boolean;
    };
