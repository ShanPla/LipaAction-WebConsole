"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { usePreferences } from "@/lib/preferences";
import { MESSAGES, type Lang, type MessageKey } from "@/lib/messages";
// Type-only: auth.ts is server-only, and a type import is erased.
import type { BarangayRole } from "@/lib/auth";

export type { Lang, MessageKey };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/**
 * Looks a message up in the chosen language and fills `{name}` placeholders.
 * Pure, so helpers outside React (routing summaries, status labels) can take
 * a Translate function instead of importing a hook.
 */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = MESSAGES[key][lang];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

const LanguageContext = createContext<Lang>("en");

/**
 * The interface language for everything beneath it.
 *
 * Placed in each gated page.tsx, around the page's client component — not in
 * AppShell. The page components render AppShell rather than sit inside it,
 * so a provider inside AppShell would never reach the strings they build
 * themselves (the breadcrumb, the queue footer, empty states).
 *
 * The value comes from the shared preference store, so the top-bar EN/TL
 * toggle and the Settings page always agree. The server renders in the
 * role's default (Tagalog for a senior barangay admin, as the thesis
 * specifies); a different stored choice applies right after hydration.
 * Outside a provider — the login page, error pages, toasts — text stays in
 * English.
 */
export function LanguageProvider({ role, children }: { role: BarangayRole; children: React.ReactNode }) {
  const { prefs } = usePreferences(role);
  const lang = prefs.interfaceLanguage;

  // So screen readers pronounce the page in the language it's written in.
  // Reset on unmount: signing out moves to the login page without a reload,
  // and that page is English whatever this was set to.
  useEffect(() => {
    document.documentElement.lang = lang === "tl" ? "tl" : "en";
    return () => {
      document.documentElement.lang = "en";
    };
  }, [lang]);

  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LanguageContext);
}

export function useT(): Translate {
  const lang = useLang();
  return useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang]);
}
