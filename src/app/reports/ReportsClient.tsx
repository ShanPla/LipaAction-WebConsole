"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { DailyQueueSummary } from "@/components/reports/DailyQueueSummary";
import { ReportCatalogue } from "@/components/reports/ReportCatalogue";
import { ResolutionTimes } from "@/components/reports/ResolutionTimes";
import { VerificationActivity } from "@/components/reports/VerificationActivity";
import { useT } from "@/lib/i18n";
import type { OfficialProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { DailyQueueSummaryData } from "@/lib/data/dailyQueueSummary";
import type { ResolutionTimesData } from "@/lib/data/resolutionTimes";
import type { VerificationActivityData } from "@/lib/data/verificationActivity";

export function ReportsClient({
  official,
  summary,
  resolution,
  verification,
}: {
  official: OfficialProfile;
  summary: DailyQueueSummaryData;
  resolution: ResolutionTimesData;
  verification: VerificationActivityData;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.reports")]} official={official}>
      {/* The daily summary's failure takes the page banner; the weekly and
          monthly reports each say their own failure inside their section, so
          a failure of one never claims the others are out of date. */}
      {summary.loadFailed && <DataUnavailableBanner what={t("banner.what.reports")} />}
      <DailyQueueSummary
        summary={summary}
        barangayName={official.barangayName}
        month={resolution.month}
        currentMonth={resolution.currentMonth}
        week={verification.weekEnd}
      />
      {/* In the catalogue's order: #12 daily, #13 weekly, #16 monthly. */}
      <VerificationActivity
        data={verification}
        date={summary.date}
        month={resolution.month}
        currentMonth={resolution.currentMonth}
        barangayName={official.barangayName}
      />
      <ResolutionTimes
        data={resolution}
        date={summary.date}
        week={verification.weekEnd}
        today={summary.today}
        barangayName={official.barangayName}
      />
      {/* The rest of the thesis's barangay catalogue, #14 included: listed,
          not faked. */}
      <ReportCatalogue />
    </AppShell>
  );
}
