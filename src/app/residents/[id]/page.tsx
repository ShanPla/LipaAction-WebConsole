import { notFound, redirect } from "next/navigation";
import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { loadResidentCard, loadResidentHistory, loadSanctionStrikes } from "@/lib/residentProfile";
import { ResidentProfileClient } from "./ResidentProfileClient";

// Depends on the signed-in user's session; never prerender it.
export const dynamic = "force-dynamic";

export default async function ResidentProfilePage({ params }: { params: { id: string } }) {
  // Signed out -> /login; a city account -> /city; any other role -> /not-authorized.
  const official = await requireBarangayOfficial();
  // A desk officer sees nothing of this feature (the database refuses them too).
  if (official.role === "barangay_official") redirect("/not-authorized");
  const admin = { ...official, role: official.role };
  if (!isUuid(params.id)) notFound();

  const supabase = createClient();
  const [card, history, strikes] = await Promise.all([
    loadResidentCard(supabase, params.id),
    loadResidentHistory(supabase, params.id),
    loadSanctionStrikes(supabase, params.id), // null on any problem: the form then words the ladder generically
  ]);
  // A failed read is an outage, not a missing resident: error.tsx offers a retry.
  if (!card.ok || !history.ok) throw new Error("Couldn't load the resident profile");
  // Zero card rows (unknown, other barangay, or only withheld/discreet reports) is a 404.
  if (!card.card) notFound();

  return (
    <LanguageProvider role={official.role}>
      <ResidentProfileClient official={admin} card={card.card} history={history.rows} strikes={strikes} />
    </LanguageProvider>
  );
}
