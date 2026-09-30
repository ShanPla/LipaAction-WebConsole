import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityResponseTimes } from "@/lib/data/cityResponseTimes";
import { ResponseTimesClient } from "./ResponseTimesClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ResponseTimesPage() {
  const admin = await requireCityAdmin();
  const response = await getCityResponseTimes();
  return (
    <LanguageProvider role={admin.role}>
      <ResponseTimesClient admin={admin} response={response} />
    </LanguageProvider>
  );
}
