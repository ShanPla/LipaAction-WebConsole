import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getBarangayQueue } from "@/lib/data/queue";
import { QueueClient } from "./QueueClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const official = await requireBarangayOfficial();
  const queueData = await getBarangayQueue(official.barangayId, official.barangayName);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <QueueClient official={official} queueData={queueData} />
    </LanguageProvider>
  );
}
