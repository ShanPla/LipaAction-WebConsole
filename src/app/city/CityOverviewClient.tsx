"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { CityOverview } from "@/components/city/CityOverview";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityOverviewData } from "@/lib/data/cityOverview";

export function CityOverviewClient({
  admin,
  overview,
}: {
  admin: CityProfile;
  overview: CityOverviewData;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityOverview")]} official={admin}>
      {overview.loadFailed && <DataUnavailableBanner what={t("banner.what.cityOverview")} />}
      <ReadOnlyNote />
      <CityOverview overview={overview} />
    </AppShell>
  );
}
