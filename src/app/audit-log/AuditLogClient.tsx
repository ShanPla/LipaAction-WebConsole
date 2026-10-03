"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { useT } from "@/lib/i18n";
import { AuditSummaryTiles } from "@/components/audit-log/AuditSummaryTiles";
import { AUDIT_FILTERS, AuditFilters, type AuditFilterId, type AuditRange } from "@/components/audit-log/AuditFilters";
import { startOfManilaDay } from "@/lib/utils";
import { AuditTable } from "@/components/audit-log/AuditTable";
import type { OfficialProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { AuditLogData } from "@/lib/data/auditLog";

export function AuditLogClient({
  official,
  auditData,
}: {
  official: OfficialProfile;
  auditData: AuditLogData;
}) {
  const t = useT();
  const { entries, summary, limit, loadFailed, refusal } = auditData;
  const [filter, setFilter] = useState<AuditFilterId>("all");
  const [range, setRange] = useState<AuditRange>("all");

  const shown = useMemo(() => {
    const actions: readonly string[] = AUDIT_FILTERS[filter];
    return entries.filter(
      (e) => (actions.length === 0 || actions.includes(e.action)) && inRange(e.at, range)
    );
  }, [entries, filter, range]);
  const narrowed = filter !== "all" || range !== "all";

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.auditLog")]} official={official}>
      {loadFailed && <DataUnavailableBanner what={t("banner.what.audit")} />}

      {/* Not an outage: the function answered, and its answer was that this
          account has no trail to show. Saying so beats the red banner, which
          would send an official refreshing a page that will never load. */}
      {refusal !== null ? (
        <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
          <p className="text-sm font-medium text-ink-700">{t("audit.empty.title")}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-500">
            {t(refusal === "no_barangay" ? "audit.refusal.noBarangay" : "audit.refusal.noRole")}
          </p>
        </div>
      ) : (
        <>
          {/* What the page is, in the words of what the backend actually
              returns: roles, not officials. The old notice here said [Sample
              data] — true until the read function reached prod. */}
          <div
            role="note"
            className="mb-4 rounded-card border border-ink-100 bg-ink-50 px-4 py-3 text-xs text-ink-700"
          >
            {t("audit.notice")}
          </div>

          <AuditSummaryTiles summary={summary} />
          <AuditFilters active={filter} onChange={setFilter} range={range} onRangeChange={setRange} />
          <AuditTable entries={shown} filtered={narrowed} />

          {/* Never [the audit trail]: the function returns at most `limit`
              rows and cannot say whether older ones were dropped. */}
          <p className="mt-3 text-xs text-ink-500">
            {!narrowed
              ? t("audit.footer", { count: entries.length, limit })
              : t("audit.footerFiltered", { shown: shown.length, count: entries.length })}
          </p>
        </>
      )}
    </AppShell>
  );
}

// Manila's day, not the browser's, as on Validation History.
function inRange(at: string | undefined, range: AuditRange): boolean {
  if (range === "all") return true;
  const time = at ? Date.parse(at) : NaN;
  if (Number.isNaN(time)) return false;
  if (range === "today") return time >= startOfManilaDay().getTime();
  return time >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}
