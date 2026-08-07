"use client";

import { useState } from "react";
import type { NotificationPreferences } from "@/types";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-brand-500" : "bg-ink-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function NotificationsSection({ initial }: { initial: NotificationPreferences }) {
  const [prefs, setPrefs] = useState(initial);

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">Notifications</p>
      <p className="mb-4 text-xs text-ink-500">
        Console and mobile-push preferences. Audible alerts are muted while the mobile PWA is in
        discreet mode.
      </p>

      <div className="flex items-center justify-between border-b border-ink-100 py-3">
        <div>
          <p className="text-sm text-ink-900">Audible alert for new Tier 0 emergencies</p>
          <p className="text-xs text-ink-500">Plays a chime for fast-triage submissions.</p>
        </div>
        <Toggle
          checked={prefs.audibleAlertNewEmergency}
          onChange={(v) => setPrefs((p) => ({ ...p, audibleAlertNewEmergency: v }))}
        />
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm text-ink-900">SLA breach browser notification</p>
          <p className="text-xs text-ink-500">
            Notifies you when a queued report is about to miss its SLA window.
          </p>
        </div>
        <Toggle
          checked={prefs.slaBreachBrowserNotification}
          onChange={(v) => setPrefs((p) => ({ ...p, slaBreachBrowserNotification: v }))}
        />
      </div>
    </div>
  );
}
