import { requireBarangayAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getSanctions } from "@/lib/data/sanctions";
import { SanctionsClient } from "./SanctionsClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function SanctionsPage() {
  // barangay_admin and senior_barangay_admin only; a barangay_official is
  // sent back to the queue.
  const official = await requireBarangayAdmin();
  const data = await getSanctions(official.barangayId);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <SanctionsClient official={official} data={data} />
    </LanguageProvider>
  );
}
