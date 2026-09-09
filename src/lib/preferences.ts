"use client";

import { useCallback, useEffect, useState } from "react";
import type { BarangayRole } from "@/lib/auth";

export type InterfaceLanguage = "en" | "tl";
export type BilingualEmphasis = "english-first" | "tagalog-first" | "english-only";

export interface ConsolePreferences {
  interfaceLanguage: InterfaceLanguage;
  bilingualEmphasis: BilingualEmphasis;
  audibleAlertNewEmergency: boolean;
  slaBreachBrowserNotification: boolean;
}

/**
 * Console preferences live in this browser, on this device — deliberately.
 *
 * The thesis (Fig. 50, A.3.9) puts language, bilingual emphasis, an audible
 * Tier 0 alert, and an SLA-breach browser notification on the Settings page.
 * `profiles` has no column for any of them, and the two that matter are
 * per-device concerns by nature: whether this laptop chimes, and whether this
 * browser is allowed to show notifications (a permission the browser grants
 * per site, per profile — a server-side flag could not carry it). Storing
 * them here is the honest home, not a stand-in for a backend that's missing.
 *
 * Before this, both Settings sections held `useState` over a fixture and
 * forgot everything on navigation.
 */
const STORAGE_KEY = "lipaaction.console.preferences.v1";

export function defaultPreferences(role: BarangayRole): ConsolePreferences {
  // The paper: "The interface defaults to Tagalog for this role" (A.3, senior
  // barangay admin). The only role-specific behaviour this console can
  // currently honour — everything else role-shaped needs backend tables that
  // don't exist.
  const tagalogFirst = role === "senior_barangay_admin";
  return {
    interfaceLanguage: tagalogFirst ? "tl" : "en",
    bilingualEmphasis: tagalogFirst ? "tagalog-first" : "english-first",
    audibleAlertNewEmergency: true,
    // Off until the official turns it on: switching it on is what asks the
    // browser for permission, and a default of [on] with permission never
    // granted would be a toggle that silently does nothing.
    slaBreachBrowserNotification: false,
  };
}

function readStored(): Partial<ConsolePreferences> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Partial<ConsolePreferences>) : null;
  } catch {
    // Private window, storage disabled, or a corrupt value — behave as unset.
    return null;
  }
}

function writeStored(prefs: ConsolePreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Same cases as above. The in-memory value still applies for this page
    // load; it just won't survive a reload.
  }
}

/**
 * Preferences for the signed-in official, defaulted by role and hydrated from
 * localStorage after mount. `hydrated` is false during the server render and
 * the first client paint — controls should disable themselves until then so
 * a click can't land on a value that's about to be replaced.
 */
export function usePreferences(role: BarangayRole) {
  const [prefs, setPrefs] = useState<ConsolePreferences>(() => defaultPreferences(role));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) setPrefs({ ...defaultPreferences(role), ...stored });
    setHydrated(true);
  }, [role]);

  const update = useCallback((patch: Partial<ConsolePreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  return { prefs, update, hydrated };
}
