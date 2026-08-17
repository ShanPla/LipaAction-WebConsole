import { requireBarangayOfficial } from "@/lib/auth";
import { ClusterExplorerClient } from "./ClusterExplorerClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function ClusterExplorerPage() {
  const official = await requireBarangayOfficial();
  return <ClusterExplorerClient official={official} />;
}
