/**
 * The Content-Security-Policy for every page, built per request around a
 * fresh nonce (see middleware.ts).
 *
 * What it does: the browser runs only the scripts this site's own pages
 * carry, each marked with this request's nonce, plus whatever those scripts
 * load ('strict-dynamic'). A script injected into a page some other way (a
 * crafted link, a poisoned dependency serving an inline payload) has no
 * nonce and is refused. It is a second layer, not a fix for a known hole.
 *
 * Next.js 14 reads the nonce out of this header on the incoming request and
 * stamps it on its own inline scripts. That only happens while rendering, so
 * every page must render per request; the root layout forces that.
 *
 * Each source below is here because something uses it:
 * - connect-src: the Supabase project over HTTPS (queries, auth) and WSS
 *   (the Realtime channel the queue listens on).
 * - img-src: the same project, for report media once the app uploads it
 *   (signed URLs), plus data: and blob: for anything the browser builds,
 *   and OpenStreetMap's tile server for the street map on the city map page.
 * - media-src, only while REPORT_CHAT_MEDIA is on: the same project, for
 *   a chat video's signed URL, plus blob: for the video the official picks
 *   (chatMediaPrepare.ts reads its length from a blob: object URL; without
 *   blob: the browser blocks it and every pick fails as unreadable). Without
 *   the flag there is no media-src and default-src 'self' covers it, as
 *   before.
 * - font-src 'self': next/font serves Inter and JetBrains Mono from this
 *   site, never from Google.
 * - style-src 'unsafe-inline': a handful of computed style attributes (the
 *   city overview's bar heights) and Next's own style tags. Styles can't run
 *   code, so allowing them inline costs little.
 * - 'unsafe-eval' in development only: React's fast refresh needs it.
 *
 * No upgrade-insecure-requests: Vercel already forces HTTPS with HSTS, and on
 * a local production build (plain http://localhost) the directive would
 * rewrite the site's own requests to an https:// port nothing listens on.
 */
import { REPORT_CHAT_MEDIA } from "@/lib/features";

// The one tile host the city map loads from (CityMap.tsx); kept in step with
// the URL template there.
const OSM_TILES = "https://tile.openstreetmap.org";

export function contentSecurityPolicy(nonce: string, supabaseUrl: string | undefined): string {
  const supabase = supabaseOrigins(supabaseUrl);
  const dev = process.env.NODE_ENV === "development";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...supabase.https, OSM_TILES],
    ...(REPORT_CHAT_MEDIA ? { "media-src": ["'self'", "blob:", ...supabase.https] } : {}),
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabase.https, ...supabase.wss],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

// The project's origin for fetches and its websocket twin for Realtime.
// Nothing at all when the URL is missing or malformed: the pages then fail
// in createClient() with a clear error, and the policy stays as tight as it
// can be rather than opening to a guess.
function supabaseOrigins(url: string | undefined): { https: string[]; wss: string[] } {
  if (!url) return { https: [], wss: [] };
  try {
    const { protocol, host } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return { https: [], wss: [] };
    return { https: [`${protocol}//${host}`], wss: [`${protocol === "https:" ? "wss:" : "ws:"}//${host}`] };
  } catch {
    return { https: [], wss: [] };
  }
}

/** 16 random bytes, base64: a fresh nonce for one response. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
