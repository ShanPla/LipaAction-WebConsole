"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { CityReportList } from "@/components/city/CityReportList";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityReportsData } from "@/lib/data/cityReports";

export function CityReportsClient({ admin, data }: { admin: CityProfile; data: CityReportsData }) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityReports")]} official={admin}>
      {data.loadFailed && <DataUnavailableBanner what={t("banner.what.cityReports")} />}
      <ReadOnlyNote />
      <CityReportList data={data} />
    </AppShell>
  );
}
