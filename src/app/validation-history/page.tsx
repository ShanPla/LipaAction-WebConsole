import { requireBarangayOfficial } from "@/lib/auth";
import { getValidationHistory } from "@/lib/data/validationHistory";
import { ValidationHistoryClient } from "./ValidationHistoryClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ValidationHistoryPage() {
  const official = await requireBarangayOfficial();
  const historyData = await getValidationHistory(official.barangayId);
  return <ValidationHistoryClient official={official} historyData={historyData} />;
}
