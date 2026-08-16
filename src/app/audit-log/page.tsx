import { requireBarangayOfficial } from "@/lib/auth";
import { AuditLogClient } from "./AuditLogClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireBarangayOfficial();
  return <AuditLogClient />;
}
