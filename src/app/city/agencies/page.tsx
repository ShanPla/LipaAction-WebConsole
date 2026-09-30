import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityAgencies } from "@/lib/data/cityAgencies";
import { AgenciesClient } from "./AgenciesClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function CityAgenciesPage() {
  const admin = await requireCityAdmin();
  const data = await getCityAgencies();
  return (
    <LanguageProvider role={admin.role}>
      <AgenciesClient admin={admin} data={data} />
    </LanguageProvider>
  );
}
