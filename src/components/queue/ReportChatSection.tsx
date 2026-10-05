"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { getChatLock } from "@/app/actions/reportChat";
import { callAction } from "@/lib/callAction";
import { MAX_MESSAGE_LENGTH, type ChatLock, type SendOutcome } from "@/lib/reportChat";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useReportChat } from "./useReportChat";

// Each failed send is worded in the official's language; "sent" and null
// (the action never answered) are handled in submit().
const OUTCOME_KEY = {
  invalid: "chat.err.invalid",
  discreet: "chat.err.discreet",
  closed: "chat.err.closed",
  "rate-limited": "chat.err.rateLimited",
  "daily-cap": "chat.err.dailyCap",
  "not-accepting": "chat.err.notAccepting",
  refused: "chat.err.refused",
  "no-barangay": "chat.err.noBarangay",
  "session-expired": "chat.err.sessionExpired",
  unreachable: "chat.err.unreachable",
  off: "chat.err.off",
  failed: "chat.err.failed",
} as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * The text thread between this report's reporter and the desk. Rendered by
 * the drawer only while REPORT_CHAT_LIVE is true, and never for a discreet
 * report (which has no thread): the drawer decides that, this component
 * assumes a thread may exist.
 */
export function ReportChatSection({ reportId }: { reportId: string }) {
  const t = useT();
  const { showToast } = useToast();
  const { messages, state, capped, live, isSending, send } = useReportChat(reportId, true);
  const [draft, setDraft] = useState("");
  // Set once a send says the thread no longer takes messages, so the
  // composer stops offering what the backend will refuse.
  const [locked, setLocked] = useState(false);
  // When the thread locks, read up front so a closed report's composer is
  // disabled before anyone types, and an upcoming lock is announced.
  const [lock, setLock] = useState<ChatLock>({ kind: "unknown" });
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let cancelled = false;
    void callAction(() => getChatLock(reportId)).then((result) => {
      if (cancelled || !result) return;
      setLock(result);
      if (result.kind === "locked") setLocked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  const trimmed = draft.trim();
  const canSend = !isSending && !locked && trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;

  const submit = async () => {
    if (!canSend) return;
    const outcome: SendOutcome | null = await send(trimmed);
    if (outcome === "sent") {
      setDraft("");
      return;
    }
    if (outcome === null) {
      // The draft stays: the message may or may not have been stored.
      showToast(t("chat.err.noAnswer"), "danger");
      return;
    }
    if (outcome === "closed") setLocked(true);
    showToast(t(OUTCOME_KEY[outcome]), "danger");
  };

  return (
    <section aria-labelledby="report-chat-title" className="mt-5">
      <p id="report-chat-title" className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {t("chat.title")}
      </p>
      <p className="mb-2 text-xs text-ink-500">{t("chat.closeWarning")}</p>
      {lock.kind === "locks" && (
        <p role="note" className="mb-2 text-xs font-medium text-ink-700">
          {t("chat.lockNotice", { date: formatTime(lock.at) })}
        </p>
      )}

      {state === "loading" && <p className="text-sm text-ink-500">{t("chat.loading")}</p>}
      {state === "failed" && <p className="text-sm text-priority-medium">{t("chat.loadFailed")}</p>}
      {state === "ready" && (
        <>
          {!live && <p className="mb-2 text-xs text-ink-500">{t("chat.notLive")}</p>}
          {capped && <p className="mb-2 text-xs text-ink-500">{t("chat.capped")}</p>}
          <ul className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto" aria-live="polite">
            {messages.length === 0 && <li className="text-sm text-ink-500">{t("chat.empty")}</li>}
            {messages.map((m) => {
              const fromDesk = m.side === "barangay";
              return (
                <li
                  key={m.id}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    fromDesk ? "self-end bg-brand-500 text-white" : "self-start bg-ink-100 text-ink-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${fromDesk ? "text-white/80" : "text-ink-500"}`}>
                    {t(fromDesk ? "chat.fromDesk" : "chat.fromReporter")} · {formatTime(m.createdAt)}
                    {fromDesk && m.readAt ? ` · ${t("chat.read")}` : ""}
                  </p>
                </li>
              );
            })}
            <li ref={endRef} aria-hidden="true" />
          </ul>
        </>
      )}

      {locked ? (
        <p role="note" className="text-sm text-ink-700">
          {t("chat.readOnly")}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="report-chat-draft" className="sr-only">
            {t("chat.composerLabel")}
          </label>
          <textarea
            id="report-chat-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={3}
            disabled={isSending}
            className="w-full rounded-md border border-ink-100 px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] text-ink-500">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
            <Button type="submit" variant="primary" size="sm" disabled={!canSend}>
              {t("chat.send")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
