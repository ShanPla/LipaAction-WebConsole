"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { agencyInitials } from "@/lib/chatSeen";

export interface AgencyLabel {
  name: string;
  initials: string;
}

/**
 * The city's responder agencies by id, for naming an agency's messages and
 * avatars in the report chat (REPORT_CHAT_V2). agencies is a small
 * reference table every signed-in account may read (the queue's loader
 * reads it whole, src/lib/data/queue.ts), so it is read once per opened
 * report, whole.
 *
 * An empty map while loading or after a failure: the chat then names an
 * agency generically and still shows its message.
 */
export function useAgencyDirectory(enabled: boolean): Map<string, AgencyLabel> {
  const [agencies, setAgencies] = useState<Map<string, AgencyLabel>>(() => new Map());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await createClient().from("agencies").select("id, code, name").limit(500);
        if (cancelled) return;
        if (error || !data) {
          console.error("[report-chat] agencies not loaded", error?.code ?? "no data");
          return;
        }
        const map = new Map<string, AgencyLabel>();
        for (const a of data as { id: string; code: string | null; name: string | null }[]) {
          const name = a.name?.trim() || a.code?.trim() || "";
          map.set(a.id, { name, initials: agencyInitials(a.code, a.name) });
        }
        setAgencies(map);
      } catch {
        // The generic label stands in.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return agencies;
}
