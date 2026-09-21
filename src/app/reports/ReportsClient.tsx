"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { DailyQueueSummary } from "@/components/reports/DailyQueueSummary";
import { useT } from "@/lib/i18n";
import type { OfficialProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { DailyQueueSummaryData } from "@/lib/data/dailyQueueSummary";

export function ReportsClient({
  official,
  summary,
}: {
  official: OfficialProfile;
  summary: DailyQueueSummaryData;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.reports")]} official={official}>
      {summary.loadFailed && <DataUnavailableBanner what={t("banner.what.reports")} />}
      <DailyQueueSummary summary={summary} barangayName={official.barangayName} />

      {/* The paper's second barangay report. Listed, not faked: it counts
          false reports per reporter, and this console never reads who a
          reporter is. */}
      <section
        aria-labelledby="weekly-false-report-title"
        className="rounded-card border border-dashed border-ink-300 bg-white px-4 py-3"
      >
        <h2 id="weekly-false-report-title" className="text-sm font-semibold text-ink-700">
          {t("reports.weeklyTitle")}
        </h2>
        <p className="mt-1 text-xs text-ink-500">{t("reports.weeklyUnavailable")}</p>
      </section>
    </AppShell>
  );
}
