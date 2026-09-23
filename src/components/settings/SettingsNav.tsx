"use client";

import { cx } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { useT, type MessageKey } from "@/lib/i18n";
import type { SettingsSectionId } from "@/types";

const sections: { id: SettingsSectionId; label: MessageKey }[] = [
  { id: "profile", label: "settings.nav.profile" },
  { id: "language", label: "settings.nav.language" },
  { id: "notifications", label: "settings.nav.notifications" },
  { id: "privacy", label: "settings.nav.privacy" },
  { id: "about", label: "settings.nav.about" },
];

export function SettingsNav({
  active,
  onChange,
}: {
  active: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
}) {
  const t = useT();
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <nav className="flex flex-col p-1.5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cx(
              "flex min-h-11 items-center rounded-md px-3 text-left text-sm font-medium transition-colors",
              active === section.id
                ? "bg-brand-100 text-brand-700"
                : "text-ink-700 hover:bg-ink-100"
            )}
          >
            {t(section.label)}
          </button>
        ))}
        <div className="my-1 border-t border-ink-100" />
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
          >
            {t("shell.signOut")}
          </button>
        </form>
      </nav>
    </div>
  );
}
