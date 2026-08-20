"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Step = "email" | "code";
type Status = "idle" | "loading" | "error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      setStatus("error");
      setErrorMessage("That sign-in link is invalid or expired. Request a new code below.");
    }
  }, [searchParams]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Only pre-provisioned accounts can sign in — a barangay/agency
        // official's account must already exist (created by an admin in
        // Supabase Studio). Without this, ANY email typed here would
        // auto-create a brand new account.
        shouldCreateUser: false,
        // Still set, as a fallback: if the person clicks the link in the
        // email instead of typing the code, it still works via the existing
        // /auth/callback route. The code entry below is just the primary,
        // faster path — no second tab required.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    setStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage("That code is incorrect or expired. Check your email and try again.");
      return;
    }

    // Full navigation (not client-side router.push) so the server picks up
    // the freshly-set session cookie on the very next request — avoids any
    // race between the cookie write and the RSC navigation to a
    // force-dynamic, auth-gated page.
    router.refresh();
    window.location.href = "/queue";
  }

  function handleResend() {
    setCode("");
    setStatus("idle");
    setErrorMessage("");
    setStep("email");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-card border border-ink-100 bg-white p-6 shadow-panel">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
            L
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-900">LipaAction</p>
            <p className="text-[11px] text-ink-500">Barangay console</p>
          </div>
        </div>

        {step === "email" && (
          <form onSubmit={handleSendCode}>
            <label className="mb-1.5 block text-xs font-medium text-ink-700" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@lipa.gov.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />

            {status === "error" && (
              <p className="mb-3 text-xs text-priority-critical">{errorMessage}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={status === "loading"}
              className="w-full justify-center"
            >
              {status === "loading" ? "Sending code…" : "Send sign-in code"}
            </Button>

            <p className="mt-4 text-center text-[11px] text-ink-500">
              For barangay and agency officials only. Residents use the LipaAction mobile app.
            </p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerifyCode}>
            <p className="mb-3 text-xs text-ink-500">
              We sent a 6-digit code to <span className="font-medium text-ink-700">{email}</span>.
              Enter it below — no need to open your email in a new tab.
            </p>

            <label className="mb-1.5 block text-xs font-medium text-ink-700" htmlFor="code">
              Sign-in code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="Enter the code from your email"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mb-3 w-full rounded-md border border-ink-100 bg-ink-50 px-3 py-2 text-center text-lg tracking-widest text-ink-900 placeholder:text-sm placeholder:tracking-normal placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />

            {status === "error" && (
              <p className="mb-3 text-xs text-priority-critical">{errorMessage}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={status === "loading" || code.length < 6}
              className="w-full justify-center"
            >
              {status === "loading" ? "Verifying…" : "Verify and sign in"}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              className="mt-4 block w-full text-center text-xs font-medium text-brand-600 hover:underline"
            >
              Use a different email or resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}