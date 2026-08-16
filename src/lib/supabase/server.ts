import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client. Use this in Server Components, Server Actions, and
// Route Handlers — anywhere that runs on the server and needs the signed-in
// official's session (so RLS scopes queries to their role/barangay automatically).
//
// NOTE: this project is on Next.js 14, where next/headers' cookies() is
// SYNCHRONOUS. (Next.js 15+ made it async — don't copy an `await cookies()`
// pattern from a newer codebase into this one, it'll be a type error here.)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in the real values."
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component (not a Server Action / Route Handler) —
          // cookies() can't be written there. Safe to ignore as long as middleware
          // is also refreshing the session (see middleware.ts).
        }
      },
    },
  });
}