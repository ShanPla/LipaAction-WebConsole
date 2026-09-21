"use client";

import { useState, useTransition } from "react";
import { displayName, initials, MAX_NAME_LENGTH } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { TextPromptModal } from "@/components/ui/TextPromptModal";
import { useToast } from "@/components/ui/Toast";
import { updateDisplayName } from "@/app/actions/profile";
import { callAction } from "@/lib/callAction";
import type { OfficialProfile } from "@/lib/auth";

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
  const t = useT();

  const name = displayName(official.fullName);

  function handleSaveName(nextName: string) {
    startTransition(async () => {
      const result = await callAction(() => updateDisplayName(nextName));
      if (result === null) {
        // The prompt stays open with the typed name, so retrying is one click.
        showToast(t("profile.nameUnconfirmed"), "danger");
        return;
      }
      if (result.success) {
        setShowNamePrompt(false);
        showToast(t("profile.nameUpdated"), "success");
      } else {
        showToast(result.message ?? t("profile.nameFailed"), "danger");
      }
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-white">
            {initials(name)}
          </span>
          <div>
            <p className="text-base font-semibold text-ink-900">{name}</p>
            <p className="text-xs text-ink-500">
              {t(`role.${official.role}`)} &middot; {official.barangayName}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowNamePrompt(true)}>
          {t("profile.editName")}
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
          label={t("profile.email")}
          value={official.email ?? t("profile.notSet")}
          note={t("profile.askAdmin")}
        />
        <FieldRow
          label={t("profile.phone")}
          value={official.phone ?? t("profile.notSet")}
          note={t("profile.askAdmin")}
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
          title={t("profile.editName")}
          description={t("profile.nameDescription")}
          label={t("profile.nameLabel")}
          initialValue={official.fullName?.trim() ?? ""}
          confirmLabel={t("common.save")}
          maxLength={MAX_NAME_LENGTH}
          busy={isPending}
          onCancel={() => setShowNamePrompt(false)}
          onConfirm={handleSaveName}
        />
      )}
    </div>
  );
}
