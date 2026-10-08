"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { getAgencyGroupAccess } from "@/app/actions/reportChat";
import { callAction } from "@/lib/callAction";
import type { AgencyGroupAccess, ChatThread } from "@/lib/reportChat";
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
 * The Desk tab is offered only on a report that has been routed to an
 * agency (any agency_routing row, a returned one included, since its
 * messages stay readable): before that there is no one to write to.
 *
 * The backend lets an agency read the group thread only once the reporter
 * has accepted the consent notice that covers agency chat. Each time the
 * Group tab is shown on a routed report, report_chat_access() is asked
 * whether that has happened, and if not the tab says so. A failed read
 * says nothing.
 *
 * Rendered by the report pop-up in place of ReportChatSection only while
 * REPORT_CHAT_V2 is true; it fills the same flex column.
 */
export function ReportChatThreads({
  reportId,
  routedToAgency,
  focusComposer = false,
}: {
  reportId: string;
  // Whether the report has any agency_routing row.
  routedToAgency: boolean;
  focusComposer?: boolean;
}) {
  const t = useT();
  const [picked, setPicked] = useState<ChatThread>("group");
  const threads = routedToAgency ? THREADS : THREADS.filter((id) => id !== "desk");
  const thread: ChatThread = threads.includes(picked) ? picked : "group";
  const agencies = useAgencyDirectory(true);
  const [agencyAccess, setAgencyAccess] = useState<AgencyGroupAccess>("unknown");

  useEffect(() => {
    setAgencyAccess("unknown");
    if (thread !== "group" || !routedToAgency) return;
    let cancelled = false;
    void callAction(() => getAgencyGroupAccess(reportId)).then((result) => {
      if (!cancelled && result) setAgencyAccess(result);
    });
    return () => {
      cancelled = true;
    };
  }, [reportId, thread, routedToAgency]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label={t("chat.v2.tabsLabel")} className="flex border-b border-ink-100">
        {threads.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={thread === id}
            onClick={() => setPicked(id)}
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
        agencyConsentPending={thread === "group" && agencyAccess === "consent-pending"}
        // The row's [Chat] button opens the conversation with the reporter.
        focusComposer={focusComposer && thread === "group"}
      />
    </div>
  );
}
