import { requireBarangayOfficial } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";

// This page depends on the signed-in user's session — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const official = await requireBarangayOfficial();
  return <SettingsClient official={official} />;
}
