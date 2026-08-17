"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action, not a client-side supabase.auth.signOut() call — this runs on
// the server so it can actually clear the session cookie via the response
// (see src/lib/supabase/server.ts's cookie setAll handler). A client-only
// signOut() call clears the browser's in-memory session but is less reliable
// about the httpOnly cookie that middleware.ts and every gated page's
// requireBarangayOfficial() actually check.
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}