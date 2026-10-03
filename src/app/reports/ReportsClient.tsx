"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { DailyQueueSummary } from "@/components/reports/DailyQueueSummary";
import { ReportCatalogue } from "@/components/reports/ReportCatalogue";
import { ResolutionTimes } from "@/components/reports/ResolutionTimes";
import { useT } from "@/lib/i18n";
import type { OfficialProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { DailyQueueSummaryData } from "@/lib/data/dailyQueueSummary";
import type { ResolutionTimesData } from "@/lib/data/resolutionTimes";

export function ReportsClient({
  official,
  summary,
  resolution,
}: {
  official: OfficialProfile;
  summary: DailyQueueSummaryData;
  resolution: ResolutionTimesData;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.reports")]} official={official}>
      {/* The daily summary's failure takes the page banner; the monthly
          report says its own failure inside its section, so a failure of one
          never claims the other is out of date. */}
      {summary.loadFailed && <DataUnavailableBanner what={t("banner.what.reports")} />}
      <DailyQueueSummary
        summary={summary}
        barangayName={official.barangayName}
        month={resolution.month}
        currentMonth={resolution.currentMonth}
      />
      <ResolutionTimes
        data={resolution}
        date={summary.date}
        today={summary.today}
        barangayName={official.barangayName}
      />
      {/* The rest of the thesis's barangay catalogue, #14 included: listed,
          not faked. */}
      <ReportCatalogue />
    </AppShell>
  );
}
