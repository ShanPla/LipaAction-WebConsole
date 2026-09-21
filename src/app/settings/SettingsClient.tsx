"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { useT } from "@/lib/i18n";
import type { SettingsSectionId } from "@/types";
import type { OfficialProfile } from "@/lib/auth";

function PrivacySection() {
  const t = useT();
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">{t("settings.nav.privacy")}</p>
      <p className="mb-4 text-xs text-ink-500">{t("settings.privacy.subtitle")}</p>
      <ul className="space-y-2 text-sm text-ink-700">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          {t("settings.privacy.exports")}
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          {t("settings.privacy.withheld")}
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          {t("settings.privacy.attestations")}
        </li>
      </ul>
    </div>
  );
}

function AboutSection() {
  const t = useT();
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">{t("settings.nav.about")}</p>
      <p className="mb-4 text-xs text-ink-500">LipaAction Barangay Web Console &middot; v1.1</p>
      <p className="text-sm text-ink-700">{t("settings.about.body")}</p>
    </div>
  );
}

export function SettingsClient({ official }: { official: OfficialProfile }) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const t = useT();

  return (
    <AppShell breadcrumb={[official.barangayName, t("nav.settings")]} official={official}>
      <div className="flex gap-4">
        <SettingsNav active={activeSection} onChange={setActiveSection} />
        <div className="flex-1 space-y-4">
          {activeSection === "profile" && <ProfileCard official={official} />}
          {activeSection === "language" && <LanguageSection role={official.role} />}
          {activeSection === "notifications" && <NotificationsSection role={official.role} />}
          {activeSection === "privacy" && <PrivacySection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </AppShell>
  );
}
