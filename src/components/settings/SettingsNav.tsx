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
    <div className="shrink-0 overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel md:w-56">
      <nav className="flex flex-row overflow-x-auto p-1.5 md:flex-col md:overflow-visible">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cx(
              "flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-left text-sm font-medium transition-colors",
              active === section.id
                ? "bg-brand-100 text-brand-700"
                : "text-ink-700 hover:bg-ink-100"
            )}
          >
            {t(section.label)}
          </button>
        ))}
        <div className="mx-1 my-auto h-6 w-px shrink-0 bg-ink-100 md:mx-0 md:my-1 md:h-px md:w-full" />
        <form action={signOut} className="shrink-0 md:w-full">
          <button
            type="submit"
            className="flex min-h-11 w-full shrink-0 items-center whitespace-nowrap rounded-md px-3 text-left text-sm font-medium text-priority-critical hover:bg-priority-criticalBg"
          >
            {t("shell.signOut")}
          </button>
        </form>
      </nav>
    </div>
  );
}
