"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { ChatThread } from "@/lib/reportChat";
import { ReportChatSection } from "./ReportChatSection";
import { useAgencyDirectory } from "./useAgencyDirectory";

const THREADS: readonly ChatThread[] = ["group", "desk"];

/**
 * The report chat under REPORT_CHAT_V2: two threads on one report, as tabs.
 *
 * - Group: the reporter, this desk and every agency the report is routed
 *   to. An agency routed later reads the earlier messages too.
 * - Desk: staff only, this desk and the routed agencies. The reporter never
 *   reads it (the backend gives a resident no access to its table at all).
 *
 * Only the tab on screen is mounted, as the pop-up does with its own tabs:
 * a thread marks itself seen when it appears, and that must mean an
 * official can see it.
 *
 * Rendered by the report pop-up in place of ReportChatSection only while
 * REPORT_CHAT_V2 is true; it fills the same flex column.
 */
export function ReportChatThreads({ reportId, focusComposer = false }: { reportId: string; focusComposer?: boolean }) {
  const t = useT();
  const [thread, setThread] = useState<ChatThread>("group");
  const agencies = useAgencyDirectory(true);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label={t("chat.v2.tabsLabel")} className="flex border-b border-ink-100">
        {THREADS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={thread === id}
            onClick={() => setThread(id)}
            className={`min-h-11 flex-1 px-3 text-sm font-medium ${
              thread === id ? "border-b-2 border-brand-500 text-ink-900" : "text-ink-500"
            }`}
          >
            {t(id === "group" ? "chat.v2.tab.group" : "chat.v2.tab.desk")}
          </button>
        ))}
      </div>
      <ReportChatSection
        // A new thread is a new section: its own messages, markers and draft.
        key={thread}
        reportId={reportId}
        thread={thread}
        agencies={agencies}
        // The row's [Chat] button opens the conversation with the reporter.
        focusComposer={focusComposer && thread === "group"}
      />
    </div>
  );
}
