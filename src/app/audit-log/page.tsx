import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getBarangayAuditLog } from "@/lib/data/auditLog";
import { AuditLogClient } from "./AuditLogClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const official = await requireBarangayOfficial();
  // Scoped by the read function itself, which resolves the caller's barangay
  // server-side; the page passes no id to it.
  const auditData = await getBarangayAuditLog();
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <AuditLogClient official={official} auditData={auditData} />
    </LanguageProvider>
  );
}
