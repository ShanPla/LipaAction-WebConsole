"use client";

import { useToast } from "@/components/ui/Toast";
import { usePreferences } from "@/lib/preferences";
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
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
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
      showToast("This browser doesn't support notifications", "danger");
      return;
    }
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("Notifications are blocked for this site in your browser settings", "danger");
      return;
    }
    update({ slaBreachBrowserNotification: true });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">Notifications</p>
      <p className="mb-4 text-xs text-ink-500">
        Saved in this browser only &middot; Naka-save sa device na ito. Alerts fire while the
        Queue page is open in this browser; nothing is sent when the console is closed.
      </p>

      <div className="flex items-center justify-between gap-4 border-b border-ink-100 py-3">
        <div>
          <p className="text-sm text-ink-900">Audible alert for new Tier 0 emergencies</p>
          <p className="text-xs text-ink-500">
            Plays a short chime when a new fast-triage report arrives while the Queue is open.
          </p>
        </div>
        <Toggle
          label="Audible alert for new Tier 0 emergencies"
          checked={prefs.audibleAlertNewEmergency}
          disabled={!hydrated}
          onChange={(audibleAlertNewEmergency) => update({ audibleAlertNewEmergency })}
        />
      </div>

      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm text-ink-900">SLA breach browser notification</p>
          <p className="text-xs text-ink-500">
            Shows a browser notification when a Tier 0 report has waited more than 5 minutes
            without a decision. Your browser will ask for permission the first time.
          </p>
        </div>
        <Toggle
          label="SLA breach browser notification"
          checked={prefs.slaBreachBrowserNotification}
          disabled={!hydrated}
          onChange={handleBrowserNotificationToggle}
        />
      </div>
    </div>
  );
}
