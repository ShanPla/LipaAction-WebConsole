import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Use this inside "use client" components — e.g.
// the login form's supabase.auth.signInWithOtp() / verifyOtp() calls.
//
// Only the PUBLIC anon/publishable key belongs here (RLS guards every row).
// Never import the service-role key into anything under src/ — that key must
// only ever be used server-side (and this project doesn't need it at all,
// since every write we do goes through RLS-authenticated calls as the signed-in
// official, not a privileged service role).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in the real values."
    );
  }

  return createBrowserClient(url, anonKey);
}