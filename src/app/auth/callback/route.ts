import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where the magic-link email points to. Supabase appends ?code=... to this URL;
// exchanging that code for a session is what actually signs the user in.
//
// Always lands on /queue. An earlier version honoured a `?next=` parameter and
// built the redirect by concatenation — `${origin}${next}` — so a value like
// `@evil.com` or `.evil.com` changed the host, an open redirect on the sign-in
// path of a government console. Nothing in the app ever sent `next`, so it was
// removed rather than validated. If a post-sign-in destination is ever needed,
// accept only an exact allow-list of console routes, and resolve it with
// `new URL(path, origin)` only AFTER that check: `new URL("//evil.com", origin)`
// resolves off-origin.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/queue", origin));
    }
  }

  // Code missing or invalid/expired — send back to login with an error flag
  // instead of leaving the user on a blank page.
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
