"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { AgencyResponseTable } from "@/components/city/AgencyResponseTable";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityResponseData } from "@/lib/data/cityResponseTimes";

export function ResponseTimesClient({
  admin,
  response,
}: {
  admin: CityProfile;
  response: CityResponseData;
}) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityResponse")]} official={admin}>
      {response.loadFailed && <DataUnavailableBanner what={t("banner.what.cityResponse")} />}
      <ReadOnlyNote />
      <AgencyResponseTable response={response} />
    </AppShell>
  );
}
