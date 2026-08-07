"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { currentOfficial, notificationPreferences } from "@/data/mockSettings";
import type { SettingsSectionId } from "@/types";

function PrivacySection() {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">Privacy & data rights</p>
      <p className="mb-4 text-xs text-ink-500">
        RA 10173 Data Privacy Act controls for records within your barangay scope.
      </p>
      <ul className="space-y-2 text-sm text-ink-700">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          Exports respect Row-Level Security — you can only export records from your own
          barangay.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          Identity-withheld reports never expose the reporter's name in any surface you can
          access.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-600" aria-hidden>
            •
          </span>
          Tier 1 attestations store the event only — no government ID, ID number, or biometric
          data is retained.
        </li>
      </ul>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">About / Support</p>
      <p className="mb-4 text-xs text-ink-500">LipaAction Barangay Web Console &middot; v1.1</p>
      <p className="text-sm text-ink-700">
        For platform issues, contact the LipaAction pilot support desk at CDRRMO Lipa City.
        For account or role-grant questions, contact your Punong Barangay.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");

  return (
    <AppShell breadcrumb={["Brgy. Tambo", "Settings"]}>
      <div className="flex gap-4">
        <SettingsNav active={activeSection} onChange={setActiveSection} />
        <div className="flex-1 space-y-4">
          {activeSection === "profile" && <ProfileCard profile={currentOfficial} />}
          {activeSection === "language" && <LanguageSection />}
          {activeSection === "notifications" && (
            <NotificationsSection initial={notificationPreferences} />
          )}
          {activeSection === "privacy" && <PrivacySection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </AppShell>
  );
}
