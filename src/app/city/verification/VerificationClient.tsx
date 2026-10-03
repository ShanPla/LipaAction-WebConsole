"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
import { ReadOnlyNote } from "@/components/city/ReadOnlyNote";
import { VerificationQuality } from "@/components/city/VerificationQuality";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";
// Type-only import from a server-only module — erased at compile time.
import type { CityVerificationData } from "@/lib/data/cityVerification";

export function VerificationClient({ admin, data }: { admin: CityProfile; data: CityVerificationData }) {
  const t = useT();

  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.cityVerification")]} official={admin}>
      {data.loadFailed && <DataUnavailableBanner what={t("banner.what.cityVerification")} />}
      <ReadOnlyNote />
      <VerificationQuality data={data} />
    </AppShell>
  );
}
