"use client";

import { cx } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
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
  const { showToast } = useToast();

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
        <button
          onClick={() => showToast("Signed out (mockup only — no session was active)", "info")}
          className="rounded-md px-3 py-2 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
