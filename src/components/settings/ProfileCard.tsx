import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { OfficialProfile } from "@/types";

function FieldRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-3 last:border-0">
      <div>
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="text-sm text-ink-900">{value}</p>
      </div>
      {action && (
        <Button variant="ghost" size="sm">
          {action}
        </Button>
      )}
    </div>
  );
}

export function ProfileCard({ profile }: { profile: OfficialProfile }) {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-white">
            {initials(profile.name)}
          </span>
          <div>
            <p className="text-base font-semibold text-ink-900">{profile.name}</p>
            <p className="text-xs text-ink-500">
              {profile.role} &middot; {profile.barangay}, {profile.city}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          Edit display name
        </Button>
      </div>

      <div className="divide-y divide-ink-100">
        <FieldRow label="Email" value={profile.email} action="Change" />
        <FieldRow label="Phone" value={profile.phone} action="Change" />
        <FieldRow
          label="Password"
          value={profile.mfaEnabled ? "Strong · MFA enabled" : "MFA not enabled"}
          action="Change password"
        />
        <FieldRow
          label="Role & barangay"
          value={`Granted by ${profile.roleGrantedBy} on ${profile.roleGrantedDate}`}
        />
      </div>
    </div>
  );
}
