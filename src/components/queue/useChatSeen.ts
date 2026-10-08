"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SEEN_COLUMNS, toSeenRow, type SeenRow } from "@/lib/chatSeen";
import type { ChatThread } from "@/lib/reportChat";

// The thread's own fallback cadence (useReportChat).
const SEEN_POLL_MS = 30_000;

/**
 * One thread's seen markers (REPORT_CHAT_V2), kept current: who has opened
 * it and how far each participant has read. Read in the browser and
 * followed on a Realtime channel, as the thread itself is; row-level
 * security decides which markers this official may see.
 *
 * mark_report_chat_seen() writes a marker only when it moves forward, so a
 * marker changes, and the channel delivers, only when someone has read
 * something new. Realtime is a signal: a whole row is applied as it
 * stands, anything else reads the markers again, and so does every
 * (re)subscribe. While the channel isn't delivering, they are read on a
 * timer.
 *
 * A marker that fails to load is not an error on screen: the avatars and
 * the "opened by" row are left out, and the thread works as before.
 */
export function useChatSeen(reportId: string, thread: ChatThread, enabled: boolean) {
  const [rows, setRows] = useState<SeenRow[]>([]);
  const [live, setLive] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const { data, error } = await createClient()
        .from("report_chat_seen")
        .select(SEEN_COLUMNS)
        .eq("report_id", reportId)
        .eq("thread", thread)
        // One row per participant: the resident, the desk, each agency.
        .limit(100);
      if (seq !== loadSeq.current) return;
      if (error || !data) {
        console.error("[report-chat-seen] not loaded", error?.code ?? "no data");
        return;
      }
      setRows((data as unknown[]).map(toSeenRow).filter((r): r is SeenRow => r !== null));
    } catch {
      // Logged by the browser; the markers simply stay as they were.
    }
  }, [reportId, thread]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void load();

    // The token before the join, as for the thread's own channel.
    void supabase.realtime
      .setAuth()
      .catch(() => undefined)
      .then(() => {
        if (disposed) return;
        channel = supabase
          .channel(`report-chat-seen-${thread}:${reportId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "report_chat_seen", filter: `report_id=eq.${reportId}` },
            (payload) => {
              if (disposed) return;
              const row = payload.eventType === "DELETE" ? null : toSeenRow(payload.new);
              if (!row || row.reportId !== reportId) {
                void load();
                return;
              }
              // The other thread's markers arrive on the same filter.
              if (row.thread !== thread) return;
              setRows((prev) => [...prev.filter((r) => r.id !== row.id), row]);
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
      loadSeq.current += 1;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, reportId, thread, load]);

  useEffect(() => {
    if (!enabled || live) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, SEEN_POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, live, load]);

  return { rows, reload: load };
}
