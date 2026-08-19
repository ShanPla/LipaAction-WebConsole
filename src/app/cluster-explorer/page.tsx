import { requireBarangayOfficial } from "@/lib/auth";
import { getBarangayClusters } from "@/lib/data/clusters";
import { ClusterExplorerClient } from "./ClusterExplorerClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ClusterExplorerPage() {
  const official = await requireBarangayOfficial();
  const clusters = await getBarangayClusters(official.barangayId, official.barangayName);
  return <ClusterExplorerClient official={official} clusters={clusters} />;
}
