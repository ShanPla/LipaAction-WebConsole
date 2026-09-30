"use client";

import { useT } from "@/lib/i18n";

/**
 * Said on every city page. The role behind it can write city-wide under RLS,
 * so read-only is this console's choice, and the page should say so rather
 * than leave an administrator hunting for buttons.
 */
export function ReadOnlyNote() {
  const t = useT();
  return (
    <p role="note" className="mb-4 rounded-card border border-ink-100 bg-white px-4 py-2.5 text-xs text-ink-700">
      {t("city.readOnly")}
    </p>
  );
}
