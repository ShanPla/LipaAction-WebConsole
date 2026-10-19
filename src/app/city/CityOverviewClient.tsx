"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { CityOverview } from "@/components/city/CityOverview";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { AutoRoutingSwitch } from "@/components/city/AutoRoutingSwitch";
import { setAutoRouting } from "@/app/actions/autoRouting";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
import type { AutoRoutingState } from "@/lib/autoRouting";
// Type-only import from a server-only module — erased at compile time.
import type { CityOverviewData } from "@/lib/data/cityOverview";

export function CityOverviewClient({
  admin,
  overview,
  autoRouting,
}: {
  admin: CityProfile;
  overview: CityOverviewData;
  autoRouting: AutoRoutingState;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityOverview")]} official={admin}>
      {overview.loadFailed && <DataUnavailableBanner what={t("banner.what.cityOverview")} />}
      <ReadOnlyNote />
      <AutoRoutingSwitch role={admin.role} initial={autoRouting} save={setAutoRouting} />
      <CityOverview overview={overview} />
    </AppShell>
  );
}
