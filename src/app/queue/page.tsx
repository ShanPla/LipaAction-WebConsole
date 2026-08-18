import { requireBarangayOfficial } from "@/lib/auth";
import { getBarangayQueue } from "@/lib/data/queue";
import { QueueClient } from "./QueueClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const official = await requireBarangayOfficial();
  const queueData = await getBarangayQueue(official.barangayId, official.barangayName);
  return <QueueClient official={official} queueData={queueData} />;
}
