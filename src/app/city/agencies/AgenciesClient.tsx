"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { AgencyList } from "@/components/city/AgencyList";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityAgenciesData } from "@/lib/data/cityAgencies";

export function AgenciesClient({ admin, data }: { admin: CityProfile; data: CityAgenciesData }) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityAgencies")]} official={admin}>
      {data.loadFailed && <DataUnavailableBanner what={t("banner.what.cityAgencies")} />}
      <ReadOnlyNote />
      <AgencyList data={data} />
    </AppShell>
  );
}
