"use client";

import { cx } from "@/lib/utils";
import { usePreferences, type BilingualEmphasis, type InterfaceLanguage } from "@/lib/preferences";
import type { BarangayRole } from "@/lib/auth";

function SegmentedControl<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-ink-100 bg-ink-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cx(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
            value === opt.value ? "bg-white text-brand-700 shadow-panel" : "text-ink-500"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const languageOptions: { value: InterfaceLanguage; label: string }[] = [
  { value: "en", label: "English primary" },
  { value: "tl", label: "Tagalog Filipino" },
];

const emphasisOptions: { value: BilingualEmphasis; label: string }[] = [
  { value: "english-first", label: "English first" },
  { value: "tagalog-first", label: "Tagalog first" },
  { value: "english-only", label: "English only" },
];

/**
 * Language preference, saved on this device.
 *
 * Honest about its reach: the console is English with Tagalog labels beside
 * the key terms, and no full Tagalog interface exists yet, so the choice is
 * recorded but changes no screen today. It stays because the thesis puts it
 * here (Fig. 50) and because the default is the one role-specific behaviour
 * the console can honour — senior barangay admins default to Tagalog. The
 * copy this replaced described a [Records List] that this console never had.
 */
export function LanguageSection({ role }: { role: BarangayRole }) {
  const { prefs, update, hydrated } = usePreferences(role);

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">Language preferences</p>
      <p className="mb-4 text-xs text-ink-500">
        Saved in this browser only &middot; Naka-save sa device na ito. The console is currently
        shown in English with Tagalog labels alongside; a full Tagalog interface is not available
        yet, so this choice is recorded but does not change the screens today.
      </p>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          Interface language &middot; <span className="text-ink-500">wika</span>
        </p>
        <SegmentedControl
          options={languageOptions}
          value={prefs.interfaceLanguage}
          disabled={!hydrated}
          onChange={(interfaceLanguage) => update({ interfaceLanguage })}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          Bilingual emphasis &middot;{" "}
          <span className="text-ink-500">diin sa pagkakasunud-sunod</span>
        </p>
        <SegmentedControl
          options={emphasisOptions}
          value={prefs.bilingualEmphasis}
          disabled={!hydrated}
          onChange={(bilingualEmphasis) => update({ bilingualEmphasis })}
        />
      </div>
    </div>
  );
}
