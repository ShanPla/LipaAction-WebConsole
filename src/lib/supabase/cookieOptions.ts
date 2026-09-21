import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Options for the Supabase session cookie, shared by every client factory —
 * server.ts, client.ts, and middleware.ts. All three must pass the SAME
 * options: each one rewrites the same sb-<ref>-auth-token cookie, and a
 * writer that left an option out would silently reset it on its next write.
 *
 * Deliberately NOT marked server-only: client.ts pulls this into the browser.
 *
 * - `secure` in production: the cookie carries the access and refresh
 *   tokens, and without Secure it may travel over plain HTTP. The host's HSTS
 *   header covers browsers that have seen it; this covers the cookie itself.
 *   Off in development so `npm run dev` over http://localhost keeps working.
 * - `sameSite: "lax"` is @supabase/ssr's own default, restated so all three
 *   writers visibly agree.
 * - NOT httpOnly, and it must never be: the browser client (Realtime, the
 *   OTP form) reads the session from this cookie. An earlier comment in this
 *   codebase called it httpOnly; it never was. What protects it from script
 *   is the absence of any injection sink, not the cookie flag.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};
