import { requireBarangayOfficial } from "@/lib/auth";
import { ValidationHistoryClient } from "./ValidationHistoryClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function ValidationHistoryPage() {
  const official = await requireBarangayOfficial();
  return <ValidationHistoryClient official={official} />;
}
