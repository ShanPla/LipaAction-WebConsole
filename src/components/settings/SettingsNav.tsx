"use client";

import { cx } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import type { SettingsSectionId } from "@/types";

const sections: { id: SettingsSectionId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "language", label: "Language" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy & data rights" },
  { id: "about", label: "About / Support" },
];

export function SettingsNav({
  active,
  onChange,
}: {
  active: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}) {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <nav className="flex flex-col p-1.5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cx(
              "rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
              active === section.id
                ? "bg-brand-100 text-brand-700"
                : "text-ink-700 hover:bg-ink-100"
            )}
          >
            {section.label}
          </button>
        ))}
        <div className="my-1 border-t border-ink-100" />
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
          >
            Sign out
          </button>
        </form>
      </nav>
    </div>
  );
}
