"use client";

import { useState, useTransition } from "react";
import { initials, roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TextPromptModal } from "@/components/ui/TextPromptModal";
import { useToast } from "@/components/ui/Toast";
import { updateDisplayName } from "@/app/actions/profile";
import type { OfficialProfile } from "@/lib/auth";

const MAX_NAME_LENGTH = 80;

function FieldRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-3 last:border-0">
      <div>
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="text-sm text-ink-900">{value}</p>
      </div>
      {note && <p className="max-w-[220px] text-right text-xs text-ink-500">{note}</p>}
    </div>
  );
}

export function ProfileCard({ official }: { official: OfficialProfile }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const displayName = official.fullName ?? "Unnamed official";

  function handleSaveName(name: string) {
    startTransition(async () => {
      const result = await updateDisplayName(name);
      if (result.success) {
        setShowNamePrompt(false);
        showToast("Display name updated", "success");
      } else {
        showToast(result.message ?? "Couldn't update display name", "danger");
      }
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-white">
            {initials(displayName)}
          </span>
          <div>
            <p className="text-base font-semibold text-ink-900">{displayName}</p>
            <p className="text-xs text-ink-500">
              {roleLabel(official.role)} &middot; {official.barangayName}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowNamePrompt(true)}>
          Edit display name
        </Button>
      </div>

      <div className="divide-y divide-ink-100">
        {/* Email and phone are shown read-only on purpose. Both live in
            auth.users, not profiles, so changing either needs a real Supabase
            auth flow (updateUser + emailed confirmation, or an SMS provider
            for phone) — not a profiles write. The Change buttons that used to
            sit here fired a toast claiming a confirmation link or SMS code had
            been sent, when nothing was sent at all. A read-only value is
            honest; a button that lies about what it did is not. */}
        <FieldRow
          label="Email"
          value={official.email ?? "Not set"}
          note="Ask a municipal admin to change this"
        />
        <FieldRow
          label="Phone"
          value={official.phone ?? "Not set"}
          note="Ask a municipal admin to change this"
        />
      </div>

      {/* No [Change password] row — this system is passwordless (email OTP /
          magic-link only, shouldCreateUser: false, no signInWithPassword
          anywhere). A password-change affordance would imply a login path
          that doesn't exist here. MFA status and role-grant history (who
          granted this role, when) also aren't tracked anywhere in the
          schema — intentionally not shown rather than fabricated. */}

      {showNamePrompt && (
        <TextPromptModal
          title="Edit display name"
          description="This is the name shown on reports you validate or reject, and in your barangay's audit trail."
          label="Display name"
          initialValue={official.fullName ?? ""}
          confirmLabel="Save"
          maxLength={MAX_NAME_LENGTH}
          busy={isPending}
          onCancel={() => setShowNamePrompt(false)}
          onConfirm={handleSaveName}
        />
      )}
    </div>
  );
}
