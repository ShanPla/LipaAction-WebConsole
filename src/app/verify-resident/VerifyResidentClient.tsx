"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { Button } from "@/components/ui/Button";
import { ReasonTextModal } from "@/components/ui/ReasonTextModal";
import { useToast } from "@/components/ui/Toast";
import { AttestModal } from "@/components/verify-resident/AttestModal";
import { ResidentTable } from "@/components/verify-resident/ResidentTable";
import { residentWho, sentenceCase } from "@/components/verify-resident/who";
import { attestResident, findResidents, revokeAttestation } from "@/app/actions/residents";
import { callAction } from "@/lib/callAction";
import { cx } from "@/lib/utils";
import { useT, type MessageKey } from "@/lib/i18n";
import { isSeniorBarangayAdminRole } from "@/lib/roles";
import {
  MAX_REVOKE_REASON_LENGTH,
  RESIDENT_TIER_FILTERS,
  type AttestMethod,
  type ResidentTierFilter,
} from "@/lib/residents";
import type { WriteOutcome } from "@/lib/writeOutcome";
import type { BarangayAdminProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { ResidentRow, ResidentsData } from "@/lib/data/residents";

const TIER_LABELS: Record<ResidentTierFilter, MessageKey> = {
  tier0: "verify.filter.tier0",
  tier1: "verify.filter.tier1",
  all: "verify.filter.all",
};

// What to say for each way an attempt can end, apart from success and the
// already-done case, which name the resident. `refused` differs by action:
// the two are open to different roles.
const OUTCOME_MESSAGES: Record<Exclude<WriteOutcome, "done" | "stale" | "refused">, MessageKey> = {
  invalid: "outcome.invalid",
  "not-eligible": "verify.toast.notEligible",
  "session-expired": "outcome.sessionExpired",
  unreachable: "outcome.unreachable",
  failed: "outcome.failed",
};

/** The page's address for a tier. A search is never part of it. */
function verifyHref(tier: ResidentTierFilter): string {
  return tier === "tier0" ? "/verify-resident" : `/verify-resident?tier=${tier}`;
}

export function VerifyResidentClient({
  official,
  data,
}: {
  official: BarangayAdminProfile;
  data: ResidentsData;
}) {
  const t = useT();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const [draft, setDraft] = useState("");
  // The answer to the last search, shown in place of the page's own list
  // until it is cleared or another group is opened.
  const [found, setFound] = useState<ResidentsData | null>(null);
  const [attesting, setAttesting] = useState<ResidentRow | null>(null);
  const [revoking, setRevoking] = useState<ResidentRow | null>(null);
  const canRevoke = isSeniorBarangayAdminRole(official.role);
  const shown = found ?? data;
  // Searches are numbered, and an answer that isn't to the latest one is
  // dropped: a slow answer must not land on another group's list, or bring
  // back a search that was cleared.
  const searchSeq = useRef(0);

  // Opening another group starts from that group's own list.
  useEffect(() => {
    searchSeq.current += 1;
    setFound(null);
    setDraft("");
  }, [data.tier]);

  /** Runs a search in the group on screen; an empty one returns to the list. */
  function search(text: string) {
    const query = text.trim();
    const seq = ++searchSeq.current;
    if (query.length === 0) {
      setFound(null);
      return;
    }
    startSearch(async () => {
      const result = await callAction(() => findResidents(query, data.tier));
      if (seq !== searchSeq.current) return;
      if (result === null) {
        showToast(t("verify.search.noAnswer"), "danger");
      } else if (!result.ok) {
        showToast(t(result.outcome === "refused" ? "verify.search.refused" : OUTCOME_MESSAGES[result.outcome]), "danger");
      } else {
        setFound(result.data);
        // The box follows the search the server actually ran, after cleaning.
        setDraft(result.data.query);
      }
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    search(draft);
  }

  function report(outcome: WriteOutcome | null, resident: ResidentRow, action: "attest" | "revoke") {
    const who = residentWho(resident, t);
    if (outcome === null) {
      // No answer: the write may or may not have landed. The dialog stays
      // open, and the toast says to look before trying again.
      showToast(t("outcome.noAnswer"), "danger");
      return;
    }
    if (outcome === "done") {
      showToast(sentenceCase(t(action === "attest" ? "verify.toast.attested" : "verify.toast.revoked", { who })), "success");
    } else if (outcome === "stale") {
      // Not an error: the list was behind, and the action has refreshed it.
      showToast(sentenceCase(t(action === "attest" ? "verify.toast.staleAttest" : "verify.toast.staleRevoke", { who })), "info");
    } else if (outcome === "refused") {
      showToast(t(action === "attest" ? "verify.toast.refusedAttest" : "verify.toast.refusedRevoke"), "danger");
      return;
    } else {
      showToast(t(OUTCOME_MESSAGES[outcome]), "danger");
      return;
    }
    setAttesting(null);
    setRevoking(null);
    // The page's own list was refreshed by the action; a search result is a
    // copy held here, so it is asked for again.
    if (found) search(found.query);
  }

  function handleAttest(method: AttestMethod) {
    const resident = attesting;
    if (!resident) return;
    startTransition(async () => {
      report(await callAction(() => attestResident(resident.id, method)), resident, "attest");
    });
  }

  function handleRevoke(reason: string) {
    const resident = revoking;
    if (!resident) return;
    startTransition(async () => {
      report(await callAction(() => revokeAttestation(resident.id, reason)), resident, "revoke");
    });
  }

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.verifyResident")]} official={official}>
      {shown.loadFailed && <DataUnavailableBanner what={t("banner.what.residents")} />}

      {/* What the act is and what it records, before any name: the legal
          basis and the minimisation rule the thesis puts on this screen. */}
      <div role="note" className="mb-4 rounded-card border border-ink-100 bg-ink-50 px-4 py-3 text-xs text-ink-700">
        <p>{t("verify.intro")}</p>
        <p className="mt-1 text-ink-500">{t("verify.scope", { barangay: official.barangayName })}</p>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-3">
        <form role="search" onSubmit={handleSearch}>
          <label htmlFor="resident-search" className="mb-1 block text-xs font-medium text-ink-500">
            {t("verify.search.label")}
          </label>
          <div className="flex gap-2">
            <input
              id="resident-search"
              type="search"
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("verify.search.placeholder")}
              className="min-h-11 w-64 max-w-full rounded-md border border-ink-100 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />
            <Button variant="secondary" size="sm" type="submit" disabled={isSearching}>
              {isSearching ? t("common.working") : t("verify.search.submit")}
            </Button>
            {found && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  searchSeq.current += 1;
                  setFound(null);
                  setDraft("");
                }}
              >
                {t("verify.search.clear")}
              </Button>
            )}
          </div>
        </form>

        <nav aria-label={t("verify.filter.label")} className="flex flex-wrap items-center gap-1.5">
          {RESIDENT_TIER_FILTERS.map((tier) => (
            <Link
              key={tier}
              href={verifyHref(tier)}
              aria-current={data.tier === tier ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors",
                data.tier === tier
                  ? "bg-brand-500 text-white"
                  : "border border-ink-100 bg-white text-ink-700 hover:bg-ink-50"
              )}
            >
              {t(TIER_LABELS[tier])}
            </Link>
          ))}
        </nav>
      </div>

      {shown.verificationsUnavailable && (
        <p role="status" className="mb-2 text-xs text-priority-medium">
          {t("verify.detailsUnavailable")}
        </p>
      )}

      {/* Announced, since a search changes the list without a page load. */}
      <p role="status" className="sr-only">
        {found ? t("verify.search.result", { count: found.residents.length, query: found.query }) : ""}
      </p>

      <ResidentTable
        residents={shown.residents}
        tier={shown.tier}
        query={shown.query}
        loadFailed={shown.loadFailed}
        detailsUnavailable={shown.verificationsUnavailable}
        canRevoke={canRevoke}
        onVerify={setAttesting}
        onRevoke={setRevoking}
      />

      {!shown.loadFailed && shown.residents.length > 0 && (
        <p className="mt-3 text-xs text-ink-500">
          {shown.capped
            ? t("verify.footerCapped", { limit: shown.limit })
            : shown.residents.length === 1
              ? t("verify.footerOne")
              : t("verify.footer", { count: shown.residents.length })}
        </p>
      )}

      {attesting && (
        <AttestModal
          who={residentWho(attesting, t)}
          barangayName={official.barangayName}
          busy={isPending}
          onCancel={() => setAttesting(null)}
          onConfirm={handleAttest}
        />
      )}

      {revoking && (
        <ReasonTextModal
          title={t("verify.revoke.title", { whoOf: residentWho(revoking, t, "of") })}
          description={t("verify.revoke.description")}
          label={t("reason.label")}
          placeholder={t("verify.revoke.placeholder")}
          confirmLabel={t("verify.revoke.confirm")}
          maxLength={MAX_REVOKE_REASON_LENGTH}
          variant="danger"
          busy={isPending}
          onCancel={() => setRevoking(null)}
          onConfirm={handleRevoke}
        />
      )}
    </AppShell>
  );
}
