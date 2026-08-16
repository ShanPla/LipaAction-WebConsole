import { requireBarangayOfficial } from "@/lib/auth";
import { QueueClient } from "./QueueClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  await requireBarangayOfficial();
  return <QueueClient />;
}
