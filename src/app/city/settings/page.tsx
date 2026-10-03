import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { CitySettingsClient } from "./CitySettingsClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function CitySettingsPage() {
  const admin = await requireCityAdmin();
  return (
    <LanguageProvider role={admin.role}>
      <CitySettingsClient admin={admin} />
    </LanguageProvider>
  );
}
