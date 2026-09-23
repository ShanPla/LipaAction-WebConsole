"use client";

import { cx } from "@/lib/utils";
import { useLang, useT, type MessageKey } from "@/lib/i18n";
import { usePreferences, type BilingualEmphasis, type InterfaceLanguage } from "@/lib/preferences";
import type { BarangayRole } from "@/lib/auth";

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-ink-100 bg-ink-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cx(
            "min-h-11 rounded px-4 text-sm font-medium transition-colors disabled:opacity-60",
            value === opt.value ? "bg-white text-brand-700 shadow-panel" : "text-ink-500"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const languageOptions: { value: InterfaceLanguage; label: MessageKey }[] = [
  { value: "en", label: "language.option.en" },
  { value: "tl", label: "language.option.tl" },
];

const emphasisOptions: BilingualEmphasis[] = ["english-first", "tagalog-first", "english-only"];

/**
 * Language preference, saved on this device.
 *
 * Interface language is real: it switches the console's own text between
 * English and Tagalog (src/lib/messages.ts), and it is the same stored value
 * as the EN/TL switch in the top bar. The copy says what it does not reach —
 * report text, server-formatted values, sign-in and error pages — rather
 * than implying a fully Tagalog console.
 *
 * Bilingual emphasis is still recorded only. The thesis puts it here
 * (Fig. 50), but nothing reads it yet, and the copy under it says so; don't
 * make it look like it does more. Senior barangay admins default to Tagalog
 * for both, as the paper specifies.
 */
export function LanguageSection({ role }: { role: BarangayRole }) {
  const { prefs, update, hydrated } = usePreferences(role);
  const t = useT();
  const lang = useLang();

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">{t("language.title")}</p>
      <p className="mb-4 text-xs text-ink-500">{t("language.body")}</p>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          {t("language.interface")}
          {lang === "en" && (
            <>
              {" "}
              &middot; <span className="text-ink-500">wika</span>
            </>
          )}
        </p>
        <SegmentedControl
          label={t("language.interface")}
          options={languageOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
          value={prefs.interfaceLanguage}
          disabled={!hydrated}
          onChange={(interfaceLanguage) => update({ interfaceLanguage })}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          {t("language.emphasis")}
          {lang === "en" && (
            <>
              {" "}
              &middot; <span className="text-ink-500">diin sa pagkakasunud-sunod</span>
            </>
          )}
        </p>
        <SegmentedControl
          label={t("language.emphasis")}
          options={emphasisOptions.map((value) => ({ value, label: t(`language.emphasis.${value}`) }))}
          value={prefs.bilingualEmphasis}
          disabled={!hydrated}
          onChange={(bilingualEmphasis) => update({ bilingualEmphasis })}
        />
        <p className="mt-1.5 text-xs text-ink-500">{t("language.emphasisNote")}</p>
      </div>
    </div>
  );
}
