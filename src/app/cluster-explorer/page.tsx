import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getBarangayClusters } from "@/lib/data/clusters";
import { ClusterExplorerClient } from "./ClusterExplorerClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ClusterExplorerPage() {
  const official = await requireBarangayOfficial();
  const clusterData = await getBarangayClusters(official.barangayId, official.barangayName);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <ClusterExplorerClient official={official} clusterData={clusterData} />
    </LanguageProvider>
  );
}
