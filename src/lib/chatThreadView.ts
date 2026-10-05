import type { ChatMessage } from "@/lib/reportChat";

/**
 * Pure helpers for drawing a report's thread the way a messaging app does:
 * which side a bubble sits on, where the day separators go, and which bubble
 * in a run carries the sender and time line. No React, no clock but the one
 * passed in the data, so it can be checked on its own.
 */

/** Messages from the same side this close together read as one run. */
export const RUN_GAP_MS = 5 * 60 * 1000;

export type BubbleSide = "desk" | "reporter";

/** The desk is the viewer here, so it sits on the right, as "me" does in a messenger. */
export function bubbleSide(m: Pick<ChatMessage, "side">): BubbleSide {
  return m.side === "barangay" ? "desk" : "reporter";
}

/**
 * The calendar day of an instant in Asia/Manila, as YYYY-MM-DD. Pinned to
 * Manila like every other timestamp in the console, so an official's laptop
 * zone can't move a message to another day.
 */
export function manilaDayKey(iso: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export type ThreadItem =
  | { kind: "day"; key: string; iso: string }
  | {
      kind: "message";
      message: ChatMessage;
      side: BubbleSide;
      // True on the last bubble of a run: it carries the sender, time and
      // Read line, so a burst of messages isn't a wall of timestamps.
      showMeta: boolean;
    };

/**
 * Turns a thread (oldest first, as sortMessages returns it) into the rows to
 * draw: a day separator before the first message of each Manila day, and a
 * showMeta flag on the last bubble of each run. A run ends at a change of
 * side, a change of day, or a gap longer than RUN_GAP_MS.
 */
export function buildThreadItems(messages: ChatMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];
  let lastDay: string | null = null;
  messages.forEach((message, i) => {
    const day = manilaDayKey(message.createdAt);
    if (day !== lastDay) {
      items.push({ kind: "day", key: day, iso: message.createdAt });
      lastDay = day;
    }
    const next = messages[i + 1];
    const continues =
      next !== undefined &&
      next.side === message.side &&
      manilaDayKey(next.createdAt) === day &&
      new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() <= RUN_GAP_MS;
    items.push({ kind: "message", message, side: bubbleSide(message), showMeta: !continues });
  });
  return items;
}
