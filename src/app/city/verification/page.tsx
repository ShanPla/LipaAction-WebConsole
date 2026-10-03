import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getCityVerification } from "@/lib/data/cityVerification";
import { VerificationClient } from "./VerificationClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function CityVerificationPage() {
  const admin = await requireCityAdmin();
  const data = await getCityVerification();
  return (
    <LanguageProvider role={admin.role}>
      <VerificationClient admin={admin} data={data} />
    </LanguageProvider>
  );
}
