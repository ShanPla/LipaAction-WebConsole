"use server";

import { isAuthRetryableFetchError, isAuthSessionMissingError, type AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isCityRole } from "@/lib/roles";
import {
  cleanAuthenticatorCode,
  qrImageAddress,
  unfinishedAuthenticators,
  verifiedAuthenticator,
  type SignInFactor,
  type TwoStepOutcome,
  type TwoStepSetup,
} from "@/lib/twoStep";

/*
 * Two-step sign-in for city accounts (thesis A.5.1): an authenticator app's
 * six-digit code on top of the emailed one.
 *
 * Set-up and the code check both run here, on the server, through the Auth
 * server's own factor API under the caller's session. A verified code makes
 * the session one that requireCityAdmin() accepts; the new session cookie is
 * written on this action's response.
 *
 * Public POST endpoints like every Server Action. Neither takes a factor id
 * from the caller: which factor a code is checked against is read from the
 * account itself. Both answer with a code, never the Auth server's text.
 */

type Client = ReturnType<typeof createClient>;

/**
 * The caller's sign-in factors, if the caller is a signed-in city account.
 * Two-step sign-in is the city dashboard's alone; a barangay account is
 * refused here rather than left with a factor nothing would ever ask for.
 */
async function cityFactors(supabase: Client): Promise<SignInFactor[] | Exclude<TwoStepOutcome, "done">> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) {
    // An Auth outage is not an expired session.
    return userError && isAuthRetryableFetchError(userError) ? "unreachable" : "session-expired";
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("[two-step] profile read failed", error.code, error.message);
    return "failed";
  }
  if (!profile || !isCityRole((profile as { role: string }).role)) return "refused";

  return (user.factors ?? []) as SignInFactor[];
}

/** What a refused factor call means, from its code and status alone. */
function failedOutcome(step: string, error: AuthError): Exclude<TwoStepOutcome, "done"> {
  let outcome: Exclude<TwoStepOutcome, "done">;
  if (isAuthRetryableFetchError(error) || error.status === 0) outcome = "unreachable";
  // A code that has just rolled over fails the same way as a wrong one, and
  // the answer to both is the app's current code.
  else if (error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired") outcome = "wrong-code";
  else if (error.code === "over_request_rate_limit" || error.status === 429) outcome = "too-many";
  else if (error.code === "mfa_totp_enroll_not_enabled" || error.code === "mfa_totp_verify_not_enabled") {
    outcome = "unavailable";
  } else if (
    // A session that ended between the check above and this call: the
    // library reports it as its own error class, with no code.
    isAuthSessionMissingError(error) ||
    error.status === 401 ||
    error.code === "session_not_found" ||
    error.code === "refresh_token_not_found" ||
    error.code === "refresh_token_already_used" ||
    error.code === "session_expired" ||
    error.code === "bad_jwt" ||
    error.code === "no_authorization"
  ) {
    outcome = "session-expired";
  } else outcome = "failed";

  // An Auth 5xx also arrives as a retryable fetch error. The server did
  // answer then, so it is logged, or an outage there would leave no trace.
  if (outcome === "failed" || outcome === "unavailable" || (outcome === "unreachable" && error.status)) {
    // Code and status only: the message is the Auth server's own wording.
    console.error(`[two-step] ${step} failed`, JSON.stringify({ outcome, status: error.status, code: error.code }));
  }
  return outcome;
}

/**
 * Starts set-up: asks the Auth server for a new authenticator secret and
 * returns it as a QR picture and as a key to type. Nothing is set up until a
 * code from the app is verified (submitTwoStepCode).
 *
 * Called by a button press, never by the page loading, so reloading the page
 * cannot pile up half-made factors; any left by an earlier, abandoned set-up
 * are cleared first, so the code typed next can only belong to this one.
 *
 * The secret passes through here to the page and is kept nowhere: not in a
 * log line, not in a cookie.
 */
export async function beginTwoStepSetup(): Promise<TwoStepSetup> {
  const supabase = createClient();
  const factors = await cityFactors(supabase);
  if (typeof factors === "string") return { ok: false, outcome: factors };
  if (verifiedAuthenticator(factors)) return { ok: false, outcome: "already-set-up" };

  for (const stale of unfinishedAuthenticators(factors)) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: stale.id });
    // Left behind, it would only be cleared next time.
    if (error) console.error("[two-step] clearing an unfinished set-up failed", error.status, error.code);
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "LipaAction" });
  if (error || !data) {
    return { ok: false, outcome: error ? failedOutcome("set-up", error) : "failed" };
  }
  return { ok: true, qr: qrImageAddress(data.totp.qr_code), secret: data.totp.secret };
}

/**
 * Checks a six-digit code from the authenticator app: against the account's
 * set-up authenticator when it has one (the second step of a sign-in), or
 * against the set-up in progress (which this then completes).
 *
 * The challenge and its check are made in this one call, one after the
 * other: the Auth server refuses a check that arrives from a different
 * address than the challenge did, and two calls from this server can leave
 * from two.
 */
export async function submitTwoStepCode(code: string): Promise<TwoStepOutcome> {
  const cleaned = cleanAuthenticatorCode(code);
  if (cleaned === null) return "invalid-code";

  const supabase = createClient();
  const factors = await cityFactors(supabase);
  if (typeof factors === "string") return factors;

  const factor = verifiedAuthenticator(factors) ?? unfinishedAuthenticators(factors)[0];
  if (!factor) return "no-setup";

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: cleaned });
  return error ? failedOutcome("code check", error) : "done";
}
