import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { AuditLogClient } from "./AuditLogClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const official = await requireBarangayOfficial();
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <AuditLogClient official={official} />
    </LanguageProvider>
  );
}
