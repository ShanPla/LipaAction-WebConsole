import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getBarangayQueue } from "@/lib/data/queue";
import { getRecentAuditActivity } from "@/lib/data/auditLog";
import { QueueClient } from "./QueueClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const official = await requireBarangayOfficial();
  // A barangay admin's home adds a recent-activity list (A.3.1). Loaded beside
  // the queue, never before it, and only for those roles.
  const isAdmin = official.role === "barangay_admin" || official.role === "senior_barangay_admin";
  const [queueData, recentActivity] = await Promise.all([
    getBarangayQueue(official.barangayId, official.barangayName),
    isAdmin ? getRecentAuditActivity() : Promise.resolve(null),
  ]);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <QueueClient official={official} queueData={queueData} recentActivity={recentActivity} />
    </LanguageProvider>
  );
}
