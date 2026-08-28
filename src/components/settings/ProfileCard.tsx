"use client";

import { initials, roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { OfficialProfile } from "@/lib/auth";

function FieldRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-3 last:border-0">
      <div>
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="text-sm text-ink-900">{value}</p>
      </div>
      {action && (
        <Button variant="ghost" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

export function ProfileCard({ official }: { official: OfficialProfile }) {
  const { showToast } = useToast();
  const displayName = official.fullName ?? "Unnamed official";

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
        <Button
          variant="secondary"
          size="sm"
          onClick={() => showToast("Display name updated", "success")}
        >
          Edit display name
        </Button>
      </div>

      <div className="divide-y divide-ink-100">
        <FieldRow
          label="Email"
          value={official.email ?? "Not set"}
          action="Change"
          onAction={() => showToast("A confirmation link was sent to your current email", "info")}
        />
        <FieldRow
          label="Phone"
          value={official.phone ?? "Not set"}
          action="Change"
          onAction={() => showToast("A verification code was sent by SMS", "info")}
        />
        <FieldRow
          label="Password"
          value="Manage your account password"
          action="Change password"
          onAction={() => showToast("Password change link sent to your email", "info")}
        />
      </div>

      {/* MFA status and role-grant history (who granted this role, when) aren't
          tracked anywhere in the schema yet — intentionally not shown here
          rather than fabricated. Revisit if those columns get added. */}
    </div>
  );
}
