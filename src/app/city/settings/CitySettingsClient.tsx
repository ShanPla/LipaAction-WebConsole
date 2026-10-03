"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { useT } from "@/lib/i18n";
import type { CityProfile } from "@/lib/auth";

/**
 * The city account's settings: its own name, which the city access log shows
 * beside every report it opens, and the console's language. The barangay
 * page's alert switches are left out: they drive the barangay queue, which a
 * city account never sees.
 */
export function CitySettingsClient({ admin }: { admin: CityProfile }) {
  const t = useT();
  return (
    <AppShell breadcrumb={[t("city.scope"), t("nav.settings")]} official={admin}>
      <div className="flex max-w-2xl flex-col gap-4">
        <ProfileCard official={admin} />
        <LanguageSection role={admin.role} />
      </div>
    </AppShell>
  );
}
