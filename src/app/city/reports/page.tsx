import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityReports } from "@/lib/data/cityReports";
import { CityReportsClient } from "./CityReportsClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function CityReportsPage({
  searchParams,
}: {
  searchParams: { barangay?: string | string[]; status?: string | string[] };
}) {
  const admin = await requireCityAdmin();
  // Both filters arrive in the URL; the loader proves them before use.
  const barangay = typeof searchParams.barangay === "string" ? searchParams.barangay : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const data = await getCityReports(barangay, status);
  return (
    <LanguageProvider role={admin.role}>
      <CityReportsClient admin={admin} data={data} />
    </LanguageProvider>
  );
}
