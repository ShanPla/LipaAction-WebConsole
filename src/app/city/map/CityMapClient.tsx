"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { CityMap } from "@/components/city/CityMap";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityMapData } from "@/lib/data/cityMap";

export function CityMapClient({ admin, data }: { admin: CityProfile; data: CityMapData }) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityMap")]} official={admin}>
      {data.loadFailed && <DataUnavailableBanner what={t("banner.what.cityMap")} />}
      <ReadOnlyNote />
      <CityMap data={data} />
    </AppShell>
  );
}
