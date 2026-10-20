"use client";

import { useId, useState, useTransition } from "react";
import { applyManualSanction } from "@/app/actions/residentProfile";
import { Button } from "@/components/ui/Button";
import { callAction } from "@/lib/callAction";
import { useT, type MessageKey, type Translate } from "@/lib/i18n";
import { cx, manilaDateTime } from "@/lib/utils";
import {
  MAX_EVIDENCE,
  REASON_MAX,
  REASON_MIN,
  sanctionEffect,
  TRACKS,
  toggleEvidence,
  type HistoryRow,
  type InputProblem,
  type ExtraStrikes,
  type ResidentCard,
  type SanctionFailure,
  type Track,
} from "@/lib/residentProfile";

/** Every answer the action can give, as the sentence the official reads. */
export const FAILURE_KEYS: Record<SanctionFailure | InputProblem, MessageKey> = {
  notAllowed: "resident.err.notAllowed",
  notAvailable: "resident.err.notAvailable",
  invalidInput: "resident.err.input",
  tooManyEvidence: "resident.err.tooMany",
  harsher: "resident.err.harsher",
  alreadyCounted: "resident.err.alreadyCounted",
  sessionExpired: "outcome.sessionExpired",
  unreachable: "outcome.unreachable",
  failed: "outcome.failed",
  resident: "resident.err.notAvailable",
  evidence: "resident.err.evidence",
  track: "resident.err.input",
  reasonShort: "resident.err.reasonShort",
  reasonLong: "resident.err.reasonLong",
};

/** Why the form can't go to the confirmation yet, or null. */
export function reviewProblem(evidenceCount: number, reason: string): InputProblem | null {
  if (evidenceCount === 0) return "evidence";
  const n = reason.trim().length;
  if (n < REASON_MIN) return "reasonShort";
  if (n > REASON_MAX) return "reasonLong";
  return null;
}

/**
 * The ladder sentence for the confirmation, from the card's strike counts and,
 * for spam / abusive, resident_sanction_strikes. When the count it needs is
 * unknown the wording is generic (no rung is named).
 */
export function effectText(t: Translate, track: Track, card: ResidentCard, strikes: ExtraStrikes | null = null): string {
  const effect = sanctionEffect(track, { ...card, ...strikes });
  if (!effect) return t("resident.sanction.effect.generic");
  const delta = Math.abs(effect.delta).toFixed(2);
  if (effect.kind === "cooldown") {
    return t("resident.sanction.effect.cooldown", {
      delta,
      duration: t(`resident.duration.${effect.cooldownHours}` as MessageKey),
    });
  }
  return t("resident.sanction.effect.suspension", {
    delta,
    lift: t(`resident.sanction.lift.${effect.liftedBy}` as MessageKey),
  });
}

/**
 * "Sanction this resident". Rendered only for barangay_admin and
 * senior_barangay_admin; `tracks` is tracksForRole(): the malicious and abusive
 * tracks only for the senior admin. The
 * evidence list is exactly the history rows (no typed ids). Nothing is sent
 * until the confirmation step.
 */
export function SanctionForm({
  card,
  history,
  tracks,
  strikes = null,
  initialConfirming = false,
  initialEvidence = [],
  initialReason = "",
}: {
  card: ResidentCard;
  history: HistoryRow[];
  tracks: readonly Track[];
  /** spam / abusive strike counts, or null when unknown (generic wording). */
  strikes?: ExtraStrikes | null;
  // For the self-check, which renders the form to HTML in a given state.
  initialConfirming?: boolean;
  initialEvidence?: string[];
  initialReason?: string;
}) {
  const t = useT();
  const ids = useId();
  const [track, setTrack] = useState<Track>(tracks[0] ?? "inaccurate");
  const [evidence, setEvidence] = useState<string[]>(initialEvidence);
  const [reason, setReason] = useState(initialReason);
  const [confirming, setConfirming] = useState(initialConfirming);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const offered = history.map((h) => h.reportId);
  const trimmed = reason.trim().length;

  function review(e: React.FormEvent) {
    e.preventDefault();
    const problem = reviewProblem(evidence.length, reason);
    if (problem) return setMessage({ ok: false, text: t(FAILURE_KEYS[problem]) });
    setMessage(null);
    setConfirming(true);
  }

  function apply() {
    startTransition(async () => {
      const result = await callAction(() => applyManualSanction({ residentId: card.residentId, reportIds: evidence, track, reason }));
      setConfirming(false);
      if (result === null) return setMessage({ ok: false, text: t("outcome.noAnswer") });
      if (result.ok) {
        setEvidence([]);
        setReason("");
        setMessage({ ok: true, text: t("resident.sanction.done") });
      } else {
        setMessage({ ok: false, text: t(FAILURE_KEYS[result.reason]) });
      }
    });
  }

  // Any edit closes the confirmation: what was confirmed is what is sent.
  function changeTrack(v: Track) {
    setTrack(v);
    setConfirming(false);
  }
  function changeEvidence(reportId: string) {
    setEvidence(toggleEvidence(evidence, reportId, offered));
    setConfirming(false);
  }
  function changeReason(v: string) {
    setReason(v);
    setConfirming(false);
  }

  return (
    <form onSubmit={review} aria-labelledby={`${ids}-h`} className="rounded-card border border-ink-100 bg-white p-4 shadow-panel">
      <h2 id={`${ids}-h`} className="text-sm font-semibold text-ink-900">{t("resident.sanction.title")}</h2>
      <p className="mt-1 max-w-prose text-xs text-ink-500">{t("resident.sanction.intro")}</p>

      <div className="mt-4">
        <label htmlFor={`${ids}-track`} className="text-xs font-medium text-ink-700">{t("resident.sanction.track")}</label>
        <select
          id={`${ids}-track`}
          value={track}
          onChange={(e) => changeTrack(e.target.value as Track)}
          className="mt-1 block min-h-11 w-full max-w-xs rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-900"
        >
          {TRACKS.filter((x) => tracks.includes(x)).map((x) => (
            <option key={x} value={x}>{t(`resident.sanction.track.${x}` as MessageKey)}</option>
          ))}
        </select>
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium text-ink-700">{t("resident.sanction.evidence")}</legend>
        <p className="mt-1 text-xs text-ink-500" aria-live="polite">
          {t("resident.sanction.evidenceCount", { n: evidence.length, max: MAX_EVIDENCE })}
        </p>
        <ul className="mt-2 max-h-72 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-100">
          {history.map((h) => {
            const checked = evidence.includes(h.reportId);
            const full = !checked && evidence.length >= MAX_EVIDENCE;
            const inputId = `${ids}-ev-${h.reportId}`;
            return (
              <li key={h.reportId}>
                <label htmlFor={inputId} className={cx("flex min-h-11 items-start gap-3 px-3 py-2 text-xs", full ? "opacity-50" : "cursor-pointer hover:bg-ink-50")}>
                  <input
                    id={inputId}
                    type="checkbox"
                    name="evidence"
                    value={h.reportId}
                    checked={checked}
                    disabled={full}
                    onChange={() => changeEvidence(h.reportId)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-ink-700">
                    <span className="font-mono text-ink-500">{h.createdAt ? manilaDateTime(h.createdAt) : "—"}</span>
                    {" · "}
                    {[h.category, h.priorityName, h.outcome ?? h.status].filter(Boolean).join(" · ")}
                    {checked && evidence[0] === h.reportId && (
                      <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-700">{t("resident.sanction.primary")}</span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={`${ids}-reason`} className="text-xs font-medium text-ink-700">{t("resident.sanction.reason")}</label>
        <textarea
          id={`${ids}-reason`}
          required
          rows={4}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => changeReason(e.target.value)}
          aria-describedby={`${ids}-count`}
          className="mt-1 block w-full resize-none rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
        />
        <p id={`${ids}-count`} className={cx("mt-1 text-xs", trimmed >= REASON_MIN ? "text-ink-500" : "text-priority-critical")}>
          {t("resident.sanction.reasonHelp", { n: trimmed, max: REASON_MAX })}
        </p>
      </div>

      {confirming ? (
        <div role="alertdialog" aria-labelledby={`${ids}-ch`} aria-describedby={`${ids}-cd`} className="mt-4 rounded-md border border-priority-critical/30 bg-priority-criticalBg p-4">
          <h3 id={`${ids}-ch`} className="text-sm font-semibold text-priority-critical">{t("resident.sanction.confirmTitle")}</h3>
          <p id={`${ids}-cd`} className="mt-1 text-sm text-ink-900">
            {effectText(t, track, card, strikes)} {t("resident.sanction.confirmEvidence", { n: evidence.length })} {t("resident.sanction.notified")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={pending} onClick={apply}>
              {pending ? t("common.working") : t("resident.sanction.apply")}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              {t("resident.sanction.back")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <Button type="submit" variant="danger" disabled={pending}>{t("resident.sanction.review")}</Button>
        </div>
      )}

      {message && (
        <p role={message.ok ? "status" : "alert"} className={cx("mt-3 rounded-md px-3 py-2 text-sm", message.ok ? "bg-brand-50 text-brand-700" : "bg-priority-criticalBg text-priority-critical")}>
          {message.text}
        </p>
      )}
    </form>
  );
}
