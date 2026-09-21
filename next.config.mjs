/**
 * Response headers applied to every route.
 *
 * Defence in depth, not a fix for a live hole: the session cookie is
 * SameSite=Lax, so a cross-site frame of this console is already signed out
 * and can't be clickjacked into a Validate click. These make that true by
 * policy as well as by accident — a console with one-click, irreversible
 * decisions should refuse to be framed at all — and stop the browser from
 * second-guessing content types or leaking full URLs to other origins.
 *
 * Deliberately NO Content-Security-Policy yet: Next's App Router injects
 * inline scripts, so a CSP needs per-request nonces threaded through
 * middleware. Worth doing, but as its own tested change, not bundled here.
 * Vercel already sends Strict-Transport-Security (the thesis's HSTS
 * requirement), so it isn't repeated.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The console uses notifications and audio, neither of which is governed
  // here; these three it never needs.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Stops advertising the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
