import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where the magic-link email points to. Supabase appends ?code=... to this URL;
// exchanging that code for a session is what actually signs the user in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Optional: where to send the user after sign-in (defaults to /queue).
  const next = searchParams.get("next") ?? "/queue";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or invalid/expired — send back to login with an error flag
  // instead of leaving the user on a blank page.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}