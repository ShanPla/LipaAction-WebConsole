import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityOverview } from "@/lib/data/cityOverview";
import { getAutoRoutingState } from "@/lib/data/autoRouting";
import { CityOverviewClient } from "./CityOverviewClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function CityOverviewPage() {
  const admin = await requireCityAdmin();
  const [overview, autoRouting] = await Promise.all([getCityOverview(), getAutoRoutingState()]);
  return (
    <LanguageProvider role={admin.role}>
      <CityOverviewClient admin={admin} overview={overview} autoRouting={autoRouting} />
    </LanguageProvider>
  );
}
