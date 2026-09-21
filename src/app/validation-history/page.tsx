import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getValidationHistory } from "@/lib/data/validationHistory";
import { ValidationHistoryClient } from "./ValidationHistoryClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ValidationHistoryPage() {
  const official = await requireBarangayOfficial();
  const historyData = await getValidationHistory(official.barangayId);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <ValidationHistoryClient official={official} historyData={historyData} />
    </LanguageProvider>
  );
}
