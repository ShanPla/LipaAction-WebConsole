import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookieOptions";

// Refreshes the Supabase auth session cookie on each request (the @supabase/ssr
// SSR pattern). This does NOT gate routes by itself — actual "is this user allowed
// here" checks belong in each page/layout (reading the profile's role server-side),
// same as the real dashboards app does. This just keeps the session alive so those
// server-side checks have a valid session to read in the first place.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If env is missing, no-op rather than 500ing every route — createClient() in
  // lib/supabase/server.ts raises a clear error instead when it's actually used.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      // The second argument matters. When @supabase/ssr refreshes a token it
      // passes cache headers (no-store, Expires: 0, Pragma: no-cache) that
      // must travel on the SAME response as the new Set-Cookie. Dropping them
      // lets a response carrying a fresh refresh token be cached — and the
      // matcher covers prerendered pages like / and /not-authorized.
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient() and getUser() below —
  // getUser() is what actually refreshes the token and rewrites the cookies.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and crawler files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};