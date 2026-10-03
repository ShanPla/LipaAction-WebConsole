import { requireBarangayAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getResidents } from "@/lib/data/residents";
import { VerifyResidentClient } from "./VerifyResidentClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function VerifyResidentPage({
  searchParams,
}: {
  searchParams: { tier?: string | string[] };
}) {
  // barangay_admin and senior_barangay_admin only; a barangay_official is
  // sent back to the queue.
  const official = await requireBarangayAdmin();
  // The address carries the tier and nothing else. A search is a resident's
  // name or phone number, so it travels in a Server Action's body (see
  // findResidents) and is never left in the browser's history or the web
  // host's request log. (The database's own API log still records the query a
  // search becomes.) The loader proves the tier: a repeated or unknown one is
  // the default.
  const data = await getResidents(official.barangayId, "", searchParams.tier);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <VerifyResidentClient official={official} data={data} />
    </LanguageProvider>
  );
}
