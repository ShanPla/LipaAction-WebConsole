"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Action, not a client-side supabase.auth.signOut() call — this runs on
// the server so it can clear the session cookie on the response itself (see
// src/lib/supabase/server.ts's cookie setAll handler). The cookie is NOT
// httpOnly — the browser client reads it — so the reason for doing this on the
// server is that the Set-Cookie clearing it arrives with the redirect, before
// the next page's requireBarangayOfficial() runs, rather than depending on
// client code finishing first.
//
// scope "local": revoke THIS session only. The default, "global", revokes
// every session the account holds in the Supabase project — and that project
// is shared with the resident mobile app and the agency dashboards. On
// /not-authorized, where a wrong-role account's only control is this button,
// "global" would sign an agency user out of the dashboard they do belong to.
// "local" still revokes this session server-side and still clears the cookie.
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    // The cookie is cleared regardless; a failed server-side revoke only
    // means the refresh token lives until it expires. Worth knowing, not
    // worth trapping the official on this page over.
    console.error("[signOut] revoke failed", error.status, error.code);
  }
  redirect("/login");
}
