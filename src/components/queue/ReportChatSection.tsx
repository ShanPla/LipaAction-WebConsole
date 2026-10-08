"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { getChatLock } from "@/app/actions/reportChat";
import { callAction } from "@/lib/callAction";
import { MAX_MESSAGE_LENGTH, type ChatLock, type ChatMessage, type ChatThread, type SendOutcome } from "@/lib/reportChat";
import { Button } from "@/components/ui/Button";
import { buildThreadItems } from "@/lib/chatThreadView";
import { openedBy, seenAvatarsByMessage, type Seer } from "@/lib/chatSeen";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/ui/Icon";
import { useReportChat } from "./useReportChat";
import { useChatSeen } from "./useChatSeen";
import { ChatAvatar, agencyLabelOf } from "./ChatAvatar";
import type { AgencyLabel } from "./useAgencyDirectory";

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

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// The composer grows with what is typed, up to about six lines, then scrolls.
const COMPOSER_MAX_PX = 144;

/**
 * The text thread between this report's reporter and the desk, laid out like
 * a web messenger: the thread scrolls, the composer stays pinned under it.
 * Rendered by the report pop-up only while REPORT_CHAT_LIVE is true, and
 * never for a discreet report (which has no thread): the pop-up decides
 * that, this component assumes a thread may exist.
 *
 * It fills the height its parent gives it (the pop-up's chat column), so it
 * must sit in a flex column with a bounded height.
 *
 * `thread` is given only under REPORT_CHAT_V2, by ReportChatThreads. Without
 * it this is the v1 chat exactly. With it, the section shows that thread:
 * agency messages under the agency's name, the agencies that have opened
 * it, and a small avatar under the newest message each participant has
 * seen, as a messenger does.
 */
export function ReportChatSection({
  reportId,
  focusComposer = false,
  thread,
  agencies,
  agencyConsentPending = false,
}: {
  reportId: string;
  // Set when the pop-up was opened from a row's [Chat] button: the official
  // came to write, so the composer is focused.
  focusComposer?: boolean;
  // v2 only: which thread, and the agencies' names by id.
  thread?: ChatThread;
  agencies?: Map<string, AgencyLabel>;
  // v2 group thread only: the agencies can't read it yet, because the
  // reporter hasn't accepted the consent notice that covers agency chat.
  agencyConsentPending?: boolean;
}) {
  const t = useT();
  const { showToast } = useToast();
  const { messages, state, capped, live, isSending, send } = useReportChat(reportId, true, thread);
  // v2 only; with no thread nothing is read and no channel is joined.
  const { rows: seenRows } = useChatSeen(reportId, thread ?? "group", thread !== undefined);
  const seenUnder = useMemo(
    () => (thread ? seenAvatarsByMessage(thread, messages, seenRows) : new Map<string, Seer[]>()),
    [thread, messages, seenRows]
  );
  const openers = useMemo(() => (thread ? openedBy(thread, messages, seenRows) : []), [thread, messages, seenRows]);
  const nameOf = (agencyId: string | null) => agencyLabelOf(agencies, agencyId, t).name;
  const senderLabel = (m: ChatMessage) =>
    m.side === "agency" ? nameOf(m.agencyId) : t(m.side === "barangay" ? "chat.fromDesk" : "chat.fromReporter");
  const [draft, setDraft] = useState("");
  // Set once a send says the thread no longer takes messages, so the
  // composer stops offering what the backend will refuse.
  const [locked, setLocked] = useState(false);
  // When the thread locks, read up front so a closed report's composer is
  // disabled before anyone types, and an upcoming lock is announced.
  const [lock, setLock] = useState<ChatLock>({ kind: "unknown" });
  const threadRef = useRef<HTMLUListElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const items = useMemo(() => buildThreadItems(messages), [messages]);

  // Runs before the dialog's focus trap claims the dialog itself, which only
  // does so when nothing inside has focus.
  useEffect(() => {
    if (focusComposer) draftRef.current?.focus({ preventScroll: true });
  }, [focusComposer]);

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

  // Newest message in view. Scrolls the thread itself, not the page:
  // scrollIntoView would also move the pop-up's other scroll areas.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, state]);

  // Auto-grow: reset, then fit to content.
  useLayoutEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [draft, locked]);

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
    <section aria-labelledby="report-chat-title" className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-ink-100 px-4 py-2">
        <p id="report-chat-title" className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          {t(thread === "desk" ? "chat.v2.title.desk" : thread === "group" ? "chat.v2.title.group" : "chat.title")}
        </p>
        {thread && (
          <p className={`text-xs ${thread === "desk" ? "font-medium text-ink-700" : "text-ink-500"}`}>
            {t(thread === "desk" ? "chat.v2.deskNote" : "chat.v2.groupNote")}
          </p>
        )}
        {thread === "group" && agencyConsentPending && (
          <p role="note" className="mt-1 text-xs font-medium text-ink-700">
            {t("chat.v2.agencyConsentPending")}
          </p>
        )}
        <p className="text-xs text-ink-500">{t("chat.closeWarning")}</p>
        {thread && state === "ready" && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-ink-500">{t("chat.v2.openedBy")}</span>
            {openers.length === 0 && <span className="text-[11px] text-ink-500">{t("chat.v2.openedByNone")}</span>}
            {openers.map((o) => {
              const name = nameOf(o.agencyId);
              const label = t(o.caughtUp ? "chat.v2.openedSeen" : "chat.v2.openedNotSeen", {
                agency: name,
                date: formatTime(o.openedAt),
              });
              return (
                <span
                  key={o.agencyId}
                  title={label}
                  className={`inline-flex items-center gap-1 rounded-full border border-ink-100 py-0.5 pl-0.5 pr-2 text-[11px] ${
                    o.caughtUp ? "bg-white text-ink-900" : "bg-ink-50 text-ink-700"
                  }`}
                >
                  <ChatAvatar side="agency" agencyId={o.agencyId} agencies={agencies} />
                  <span aria-hidden>{name}</span>
                  {o.caughtUp && <Icon name="check" className="h-3 w-3 text-brand-600" />}
                  <span className="sr-only">{label}</span>
                </span>
              );
            })}
          </div>
        )}
        {lock.kind === "locks" && (
          <p role="note" className="mt-1 text-xs font-medium text-ink-700">
            {t("chat.lockNotice", { date: formatTime(lock.at) })}
          </p>
        )}
        {state === "ready" && !live && <p className="mt-1 text-xs text-ink-500">{t("chat.notLive")}</p>}
        {state === "ready" && capped && <p className="mt-1 text-xs text-ink-500">{t("chat.capped")}</p>}
      </div>

      {state === "loading" && <p className="flex-1 px-4 py-3 text-sm text-ink-500">{t("chat.loading")}</p>}
      {state === "failed" && <p className="flex-1 px-4 py-3 text-sm text-priority-medium">{t("chat.loadFailed")}</p>}
      {state === "ready" && (
        <ul
          ref={threadRef}
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-3"
          aria-live="polite"
        >
          {messages.length === 0 && <li className="m-auto text-sm text-ink-500">{t("chat.empty")}</li>}
          {items.map((item) => {
            if (item.kind === "day") {
              return (
                <li key={`day-${item.key}`} className="my-3 text-center text-[11px] font-medium text-ink-500">
                  {formatDay(item.iso)}
                </li>
              );
            }
            const { message: m, side, showMeta } = item;
            const fromDesk = side === "desk";
            const seers = seenUnder.get(m.id);
            return (
              <li key={m.id} className={`flex flex-col ${fromDesk ? "items-end" : "items-start"} ${showMeta ? "mb-2" : ""}`}>
                <p
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                    fromDesk
                      ? "bg-brand-500 text-white"
                      : m.side === "agency"
                        ? "border border-ink-100 bg-ink-50 text-ink-900"
                        : "bg-ink-100 text-ink-900"
                  }`}
                >
                  {m.body}
                </p>
                {showMeta && !thread && (
                  <p className="mt-0.5 px-1 text-[11px] text-ink-500">
                    {t(fromDesk ? "chat.fromDesk" : "chat.fromReporter")} · {formatClock(m.createdAt)}
                    {fromDesk && m.readAt ? ` · ${t("chat.read")}` : ""}
                  </p>
                )}
                {showMeta && thread && (
                  <p className="mt-0.5 flex items-center gap-1 px-1 text-[11px] text-ink-500">
                    {m.side === "agency" && <ChatAvatar side="agency" agencyId={m.agencyId} agencies={agencies} />}
                    <span>
                      {senderLabel(m)} · {formatClock(m.createdAt)}
                    </span>
                  </p>
                )}
                {seers && seers.length > 0 && (
                  // Messenger's seen avatars: everyone whose newest seen
                  // message is this one, under the bubble at the right.
                  <p className="mt-0.5 flex w-full justify-end gap-0.5 px-1">
                    <span className="sr-only">
                      {t("chat.v2.seenBy", {
                        names: seers
                          .map((s) => (s.side === "resident" ? t("chat.fromReporter") : nameOf(s.agencyId)))
                          .join(", "),
                      })}
                    </span>
                    {seers.map((s) => (
                      <ChatAvatar key={s.key} side={s.side} agencyId={s.agencyId} agencies={agencies} />
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ink-100 px-4 py-3">
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
              {t(
                thread === "desk"
                  ? "chat.v2.composerLabel.desk"
                  : thread === "group"
                    ? "chat.v2.composerLabel.group"
                    : "chat.composerLabel"
              )}
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="report-chat-draft"
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter is a new line. Not while an
                  // input method is composing: Enter then confirms the text.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={1}
                readOnly={isSending}
                className="min-h-11 flex-1 resize-none rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!canSend}>
                {t("chat.send")}
              </Button>
            </div>
            <p className="mt-1 text-right text-[11px] text-ink-500">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
