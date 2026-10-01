import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityMap } from "@/lib/data/cityMap";
import { CityMapClient } from "./CityMapClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function CityMapPage() {
  const admin = await requireCityAdmin();
  const data = await getCityMap();
  return (
    <LanguageProvider role={admin.role}>
      <CityMapClient admin={admin} data={data} />
    </LanguageProvider>
  );
}
