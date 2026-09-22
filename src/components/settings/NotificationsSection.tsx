"use client";

import { useToast } from "@/components/ui/Toast";
import { usePreferences } from "@/lib/preferences";
import { playChime } from "@/lib/chime";
import { useT } from "@/lib/i18n";
import type { BarangayRole } from "@/lib/auth";

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-brand-500" : "bg-ink-300"
      }`}
    >
      {/* left-0 is load-bearing. An absolutely positioned child with no
          horizontal offset sits at its static position, and inside a
          <button> — which centres its content — that is the middle of the
          track. The knob started off-centre and, switched on, slid past the
          right edge. Anchored at the left, the two translations give an even
          2px inset: 44px track − 20px knob − 2px = 22px. */}
      <span
        aria-hidden
        className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/**
 * Alert preferences, saved on this device. Both are real: the Queue page
 * reads them (src/app/queue/QueueClient.tsx) and acts on them while it is
 * open. Neither reaches a closed tab — there is no push channel here, and
 * the copy says so rather than implying the mobile-style push the thesis
 * describes.
 */
export function NotificationsSection({ role }: { role: BarangayRole }) {
  const { prefs, update, hydrated } = usePreferences(role);
  const { showToast } = useToast();
  const t = useT();

  // Turning the browser notification on is what asks for permission. Doing
  // it here, on the click, is the only place a browser will honour the
  // request; asking on page load is ignored or blocked. If the browser says
  // no, the toggle stays off — a switch that reads [on] while nothing can
  // ever fire is the kind of control this console has spent weeks removing.
  async function handleBrowserNotificationToggle(next: boolean) {
    if (!next) {
      update({ slaBreachBrowserNotification: false });
      return;
    }
    if (typeof Notification === "undefined") {
      showToast(t("notifications.unsupported"), "danger");
      return;
    }
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      showToast(t("notifications.blocked"), "danger");
      return;
    }
    update({ slaBreachBrowserNotification: true });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">{t("settings.nav.notifications")}</p>
      <p className="mb-4 text-xs text-ink-500">{t("notifications.body")}</p>

      <div className="flex items-center justify-between gap-4 border-b border-ink-100 py-3">
        <div>
          <p className="text-sm text-ink-900">{t("notifications.audible")}</p>
          <p className="text-xs text-ink-500">{t("notifications.audibleBody")}</p>
          {/* Plays the real chime. The click is itself the gesture browsers
              require, so this also proves the speakers and the sound path
              work without waiting for a report to arrive. */}
          <button
            type="button"
            onClick={playChime}
            className="mt-1 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            {t("notifications.testSound")}
          </button>
        </div>
        <Toggle
          label={t("notifications.audible")}
          checked={prefs.audibleAlertNewEmergency}
          disabled={!hydrated}
          onChange={(audibleAlertNewEmergency) => update({ audibleAlertNewEmergency })}
        />
      </div>

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm text-ink-900">{t("notifications.sla")}</p>
          <p className="text-xs text-ink-500">{t("notifications.slaBody")}</p>
        </div>
        <Toggle
          label={t("notifications.sla")}
          checked={prefs.slaBreachBrowserNotification}
          disabled={!hydrated}
          onChange={handleBrowserNotificationToggle}
        />
      </div>
    </div>
  );
}
