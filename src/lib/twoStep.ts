// Two-step sign-in for city accounts: what the gate, the Server Actions and
// the page agree on. Nothing here touches the network, so the page's client
// half can import it.

/** A sign-in factor as the Auth server reports it on the user. */
export interface SignInFactor {
  id: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

/** The account's set-up authenticator app, or null when it has none. */
export function verifiedAuthenticator<T extends SignInFactor>(factors: T[]): T | null {
  return factors.find((f) => f.factor_type === "totp" && f.status === "verified") ?? null;
}

/**
 * Authenticator set-ups that were started and never finished. The newest is
 * the one a code is checked against; the rest are cleared when set-up starts
 * again.
 */
export function unfinishedAuthenticators<T extends SignInFactor>(factors: T[]): T[] {
  return factors
    .filter((f) => f.factor_type === "totp" && f.status !== "verified")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/**
 * The six digits of an authenticator code, with any spaces typed between
 * them removed, or null when that isn't what was sent.
 */
export function cleanAuthenticatorCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\s+/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/**
 * The QR image for an authenticator app, as a data: address an <img> can
 * show. The Auth library hands the picture over as raw SVG text behind a
 * data: prefix; raw, a [#] inside it would end the address early, so the
 * text is re-encoded as base64 here. Null when what arrived isn't an SVG,
 * and the page then offers the set-up key alone.
 */
export function qrImageAddress(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const comma = raw.indexOf(",");
  const svg = raw.startsWith("data:image/svg+xml") && comma !== -1 ? raw.slice(comma + 1) : raw;
  // The root element, after nothing but an XML declaration, comments and a
  // doctype: the Auth server's picture opens with the first two.
  const root = svg.indexOf("<svg");
  if (root === -1 || !SVG_PROLOGUE.test(svg.slice(0, root))) return null;

  // btoa takes one character per byte, so the text goes through UTF-8 first.
  let binary = "";
  for (const byte of new TextEncoder().encode(svg)) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

const SVG_PROLOGUE = /^\s*(?:<\?xml[^>]*\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*$/i;

/** How a two-step attempt ended. A code; the page words it. */
export type TwoStepOutcome =
  | "done"
  // Not six digits.
  | "invalid-code"
  // The app's code didn't match (or had just rolled over).
  | "wrong-code"
  | "too-many"
  // A code was sent before any set-up was started.
  | "no-setup"
  // Set-up was started on an account that already has an authenticator.
  | "already-set-up"
  // The project has authenticator sign-in switched off.
  | "unavailable"
  | "refused"
  | "session-expired"
  | "unreachable"
  | "failed";

export type TwoStepSetup =
  // `qr` is null when the picture couldn't be prepared; the key still works.
  | { ok: true; qr: string | null; secret: string }
  | { ok: false; outcome: Exclude<TwoStepOutcome, "done"> };
