"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useT, type MessageKey, type Translate } from "@/lib/i18n";
import { ownValue, manilaDate, manilaDateTime, sanitizeName } from "@/lib/utils";
import { canSanction, tracksForRole, type ExtraStrikes, type HistoryRow, type ResidentCard } from "@/lib/residentProfile";
import type { BarangayAdminProfile } from "@/lib/auth";
import { SanctionForm } from "./SanctionForm";

const STATE_KEYS: Record<string, MessageKey> = {
  none: "resident.state.none",
  "cooldown-inaccurate": "resident.state.cooldown-inaccurate",
  "cooldown-malicious": "resident.state.cooldown-malicious",
  "suspended-inaccurate": "resident.state.suspended-inaccurate",
  "suspended-malicious": "resident.state.suspended-malicious",
  "cooldown-spam": "resident.state.cooldown-spam",
  "cooldown-abusive": "resident.state.cooldown-abusive",
  "suspended-spam": "resident.state.suspended-spam",
  "suspended-abusive": "resident.state.suspended-abusive",
};

const TIER_KEYS: Record<string, MessageKey> = {
  tier0: "resident.card.tier.tier0",
  tier1: "resident.card.tier.tier1",
};

/** The sanction state in words, with the cooldown end time when one is running. */
export function stateText(t: Translate, card: ResidentCard): string {
  const key = ownValue(STATE_KEYS, card.sanctionState);
  // A state this console doesn't know yet is still a sanction; never print the raw value.
  if (!key) return t("resident.state.other");
  return t(key, { until: card.cooldownUntil ? manilaDateTime(card.cooldownUntil) : "—" });
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-900">{children}</dd>
    </div>
  );
}

export function ResidentCardView({ card }: { card: ResidentCard }) {
  const t = useT();
  const sanctioned = card.sanctionState !== "none";
  const tierKey = ownValue(TIER_KEYS, card.trustTier);
  return (
    <section aria-labelledby="resident-card-h" className="rounded-card border border-ink-100 bg-white p-4 shadow-panel">
      <h2 id="resident-card-h" className="text-base font-semibold text-ink-900">
        {card.displayName ? sanitizeName(card.displayName) : t("resident.unnamed")}
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label={t("resident.card.barangay")}>{card.barangayName ?? "—"}</Fact>
        <Fact label={t("resident.card.tier")}>{tierKey ? t(tierKey) : card.trustTier}</Fact>
        <Fact label={t("resident.card.score")}>{card.trustScore === null ? "—" : card.trustScore.toFixed(2)}</Fact>
        <Fact label={t("resident.card.since")}>{card.memberSince ? manilaDate(card.memberSince) : "—"}</Fact>
        <Fact label={t("resident.card.state")}>
          <Badge tone={sanctioned ? "danger" : "neutral"}>{stateText(t, card)}</Badge>
        </Fact>
        <Fact label={t("resident.card.strikes")}>
          {t("resident.card.strikesValue", { inaccurate: card.inaccurateStrikes, malicious: card.maliciousStrikes })}
        </Fact>
        <Fact label={t("resident.card.visible")}>{card.visibleReportCount}</Fact>
      </dl>
    </section>
  );
}

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const t = useT();
  if (rows.length === 0) {
    return (
      <EmptyState icon="sanctions">
        <p className="text-sm font-medium text-ink-700">{t("resident.history.empty")}</p>
      </EmptyState>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card border border-ink-100 bg-white shadow-panel">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{t("resident.history.caption")}</caption>
        <thead className="border-b border-ink-100 bg-ink-50 text-ink-500">
          <tr>
            {(["when", "category", "priority", "status", "outcome"] as const).map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">{t(`resident.history.${c}` as MessageKey)}</th>
            ))}
            <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">{t("resident.history.open")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 text-ink-700">
          {rows.map((r) => {
            const when = r.createdAt ? manilaDateTime(r.createdAt) : "—";
            return (
              <tr key={r.reportId}>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{when}</td>
                <td className="px-3 py-2">{r.category ?? "—"}</td>
                <td className="px-3 py-2">{r.priorityName ?? "—"}</td>
                <td className="px-3 py-2">{r.status ?? "—"}</td>
                <td className="px-3 py-2">{r.outcome ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/queue?report=${r.reportId}`}
                    aria-label={t("resident.history.openFor", { when })}
                    className="inline-flex min-h-11 items-center font-medium text-brand-600 underline hover:text-brand-700"
                  >
                    {t("resident.history.open")}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ResidentProfileClient({
  official,
  card,
  history,
  strikes = null,
}: {
  official: BarangayAdminProfile;
  card: ResidentCard;
  history: HistoryRow[];
  strikes?: ExtraStrikes | null;
}) {
  const t = useT();
  return (
    <AppShell breadcrumb={[official.barangayName, t("resident.crumb")]} official={official}>
      <div className="flex flex-col gap-4">
        <p role="note" className="rounded-card border border-ink-100 bg-ink-50 px-4 py-3 text-xs text-ink-500">{t("resident.privacy")}</p>
        <ResidentCardView card={card} />
        <section aria-labelledby="resident-history-h" className="flex flex-col gap-2">
          <h2 id="resident-history-h" className="text-sm font-semibold text-ink-900">{t("resident.history.title")}</h2>
          <HistoryTable rows={history} />
        </section>
        {canSanction(official.role) && history.length > 0 && (
          <SanctionForm card={card} history={history} tracks={tracksForRole(official.role)} strikes={strikes} />
        )}
      </div>
    </AppShell>
  );
}
