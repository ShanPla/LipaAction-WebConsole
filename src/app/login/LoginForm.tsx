"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      setStatus("error");
      setErrorMessage("That sign-in link is invalid or expired. Request a new one below.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Only pre-provisioned accounts can sign in — a barangay/agency official's
        // account must already exist (created by an admin in Supabase Studio).
        // Without this, ANY email typed here would auto-create a brand new account,
        // which is exactly what a government admin console must not allow.
        shouldCreateUser: false,
        // Where Supabase sends the user after they click the magic link.
        // window.location.origin keeps this correct across localhost / staging /
        // production without needing a hardcoded env var.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      // Supabase intentionally returns a generic-sounding error here so this
      // form can't be used to probe which emails have accounts and which don't.
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
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

        {status === "sent" ? (
          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-ink-900">Check your email</p>
            <p className="text-xs text-ink-500">
              We sent a sign-in link to <span className="font-medium text-ink-700">{email}</span>.
              Open it on this device to finish signing in.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 text-xs font-medium text-brand-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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
              disabled={status === "sending"}
              className="w-full justify-center"
            >
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </Button>

            <p className="mt-4 text-center text-[11px] text-ink-500">
              For barangay and agency officials only. Residents use the LipaAction mobile app.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
