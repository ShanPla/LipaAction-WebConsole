"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  markReportChatSeen,
  markReportMessagesRead,
  sendDeskMessage,
  sendReportMessage,
} from "@/app/actions/reportChat";
import { callAction } from "@/lib/callAction";
import { createClient } from "@/lib/supabase/client";
import {
  DESK_MESSAGE_COLUMNS_V2,
  GROUP_MESSAGE_COLUMNS_V2,
  MESSAGE_COLUMNS,
  THREAD_LIMIT,
  THREAD_TABLE,
  sortMessages,
  toChatMessage,
  toChatMessageV2,
  type ChatMessage,
  type ChatThread,
  type SendOutcome,
} from "@/lib/reportChat";

// How often the thread is read again while its live channel isn't
// delivering: the queue's own fallback cadence.
const THREAD_POLL_MS = 30_000;

type ThreadState = "loading" | "ready" | "failed";

/**
 * One report's thread, for the drawer: its messages, kept current, and the
 * two writes (send, mark read).
 *
 * Reading is done in the browser, as the queue's catch-up check is: the
 * thread has to follow a Realtime channel anyway, and row-level security
 * decides what this official may read (the desk of the report's barangay).
 * The writes go through Server Actions, like every other write here.
 *
 * `enabled` is false for a discreet report, which has no thread: nothing is
 * read and no channel is joined.
 *
 * Realtime is a signal, not the record (the backend's contract says so):
 * an INSERT or UPDATE that carries a whole message is applied as it stands,
 * anything else reads the thread again, and every (re)subscribe reads it
 * again too, since changes made during a gap are never replayed. While the
 * channel isn't delivering, the thread is read on a timer and `live` is
 * false, so the drawer can say so.
 *
 * `thread` is given only under REPORT_CHAT_V2. Without it this is the v1
 * chat, unchanged: report_messages, the v1 columns and reader, the v1
 * mark-read and send. With it, the hook reads that thread's table with the
 * v2 columns and keeps agency messages, marks the thread seen through the
 * v2 function (only while the page is visible), and sends on the desk
 * thread through the v2 function. The group thread keeps the v1 send.
 */
export function useReportChat(reportId: string, enabled: boolean, thread?: ChatThread) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ThreadState>("loading");
  // True when the thread holds more than THREAD_LIMIT messages and only the
  // newest are shown.
  const [capped, setCapped] = useState(false);
  const [live, setLive] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // A read that answers after a newer one started must not overwrite it.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      // Newest first with a limit, then turned round: ascending with a
      // limit would keep the oldest messages and drop the ones just sent.
      const { data, error } = await createClient()
        .from(thread ? THREAD_TABLE[thread] : "report_messages")
        .select(thread ? (thread === "desk" ? DESK_MESSAGE_COLUMNS_V2 : GROUP_MESSAGE_COLUMNS_V2) : MESSAGE_COLUMNS)
        .eq("report_id", reportId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(THREAD_LIMIT + 1);
      if (seq !== loadSeq.current) return;
      if (error || !data) {
        // A thread already on screen stays; only a first read that fails
        // has nothing to show.
        setState((prev) => (prev === "ready" ? prev : "failed"));
        return;
      }
      const read = thread ? toChatMessageV2 : toChatMessage;
      const rows = (data as unknown[]).map(read).filter((m): m is ChatMessage => m !== null);
      setCapped(rows.length > THREAD_LIMIT);
      setMessages(sortMessages(rows.slice(0, THREAD_LIMIT)));
      setState("ready");
    } catch {
      if (seq === loadSeq.current) setState((prev) => (prev === "ready" ? prev : "failed"));
    }
  }, [reportId, thread]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    // Callbacks can still arrive after cleanup has started removing the
    // channel; they must not touch state by then.
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void load();

    // The token first, then the join: a channel joined before the session
    // token is set runs as anon, answers SUBSCRIBED and receives nothing
    // (issue #1, see the queue's channel in QueueClient).
    void supabase.realtime
      .setAuth()
      .catch(() => undefined)
      .then(() => {
        if (disposed) return;
        channel = supabase
          .channel(thread ? `report-chat-${thread}:${reportId}` : `report-messages:${reportId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: thread ? THREAD_TABLE[thread] : "report_messages",
              filter: `report_id=eq.${reportId}`,
            },
            (payload) => {
              if (disposed) return;
              const read = thread ? toChatMessageV2 : toChatMessage;
              const message = payload.eventType === "DELETE" ? null : read(payload.new);
              // The filter is defence in depth; a message for another
              // report must never be drawn in this thread.
              if (!message || message.reportId !== reportId) {
                void load();
                return;
              }
              setMessages((prev) => sortMessages([...prev.filter((m) => m.id !== message.id), message]));
            }
          )
          .subscribe((status) => {
            if (disposed) return;
            if (status === "SUBSCRIBED") {
              setLive(true);
              void load();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              setLive(false);
            }
          });
      });

    return () => {
      disposed = true;
      // Any read still in flight belongs to the thread being left.
      loadSeq.current += 1;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, reportId, thread, load]);

  // The fallback, only while the channel isn't delivering.
  useEffect(() => {
    if (!enabled || live) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, THREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, live, load]);

  // Mark the reporter's messages read once they are on an official's
  // screen: on opening, and again for each one that arrives while the
  // thread is open. Each message is tried once, so a failing call can't
  // repeat for as long as the drawer stays open.
  const triedToMark = useRef(new Set<string>());
  useEffect(() => {
    if (thread || !enabled || state !== "ready") return;
    const unread = messages.filter((m) => m.side === "resident" && m.readAt === null && !triedToMark.current.has(m.id));
    if (unread.length === 0) return;
    for (const m of unread) triedToMark.current.add(m.id);
    void callAction(() => markReportMessagesRead(reportId)).then((marked) => {
      if (!marked) return;
      // The channel reports each read_at as it is set; this covers a thread
      // that is being read on the timer.
      const readAt = new Date().toISOString();
      const ids = new Set(unread.map((m) => m.id));
      setMessages((prev) => prev.map((m) => (ids.has(m.id) && m.readAt === null ? { ...m, readAt } : m)));
    });
  }, [enabled, state, messages, reportId, thread]);

  // v2: mark the thread seen while it is on an official's screen. This
  // component is mounted only while its thread is the one shown, so
  // "visible" is the page itself: on opening, for each newest message that
  // arrives, and when the tab comes back into view. A call that would not
  // move the desk's marker writes nothing on the backend, so the only
  // dedupe here is the newest message already marked; a failure is tried
  // again when the next message arrives, as v1 does.
  const markedThrough = useRef<string | null>(null);
  useEffect(() => {
    if (!thread || !enabled || state !== "ready") return;
    // "" stands for the empty thread: opening it still records "opened".
    const newest = messages.length > 0 ? messages[messages.length - 1].id : "";
    const mark = () => {
      if (document.visibilityState !== "visible" || markedThrough.current === newest) return;
      markedThrough.current = newest;
      const unread = thread === "group" ? messages.filter((m) => m.side === "resident" && m.readAt === null) : [];
      void callAction(() => markReportChatSeen(reportId, thread, unread.length > 0)).then((marked) => {
        if (!marked || unread.length === 0) return;
        // As in v1: the channel reports each read_at; this covers a thread
        // read on the timer.
        const readAt = new Date().toISOString();
        const ids = new Set(unread.map((m) => m.id));
        setMessages((prev) => prev.map((m) => (ids.has(m.id) && m.readAt === null ? { ...m, readAt } : m)));
      });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [thread, enabled, state, messages, reportId]);

  /**
   * Sends one message. null means the action never answered (see
   * callAction): the message may or may not have been stored, so the thread
   * is read again and the caller must not say which.
   */
  const send = useCallback(
    async (body: string): Promise<SendOutcome | null> => {
      setIsSending(true);
      try {
        const outcome = await callAction(() =>
          thread === "desk" ? sendDeskMessage(reportId, body) : sendReportMessage(reportId, body)
        );
        // The channel usually delivers the new message first; reading again
        // is what shows it when the channel is down, or the answer was lost.
        if (outcome === "sent" || outcome === null) void load();
        return outcome;
      } finally {
        setIsSending(false);
      }
    },
    [reportId, thread, load]
  );

  return { messages, state, capped, live, isSending, send, reload: load };
}
