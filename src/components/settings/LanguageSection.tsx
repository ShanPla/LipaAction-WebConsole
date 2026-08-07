"use client";

import { useState } from "react";
import { cx } from "@/lib/utils";

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-ink-100 bg-ink-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cx(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt ? "bg-white text-brand-700 shadow-panel" : "text-ink-500"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function LanguageSection() {
  const [interfaceLanguage, setInterfaceLanguage] = useState("English primary");
  const [bilingualEmphasis, setBilingualEmphasis] = useState("English first");

  return (
    <div className="rounded-card border border-ink-100 bg-white p-5 shadow-panel">
      <p className="mb-1 text-sm font-semibold text-ink-900">Language preferences</p>
      <p className="mb-4 text-xs text-ink-500">
        Set the language default for your Records List (offices staff still see English and
        Tagalog labels where the reporter provided both).
      </p>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          Interface language &middot; <span className="text-ink-500">wika</span>
        </p>
        <SegmentedControl
          options={["English primary", "Tagalog Filipino"]}
          value={interfaceLanguage}
          onChange={setInterfaceLanguage}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-700">
          Bilingual emphasis &middot;{" "}
          <span className="text-ink-500">diin sa pagkakasunud-sunod</span>
        </p>
        <SegmentedControl
          options={["English first", "Tagalog first", "English only"]}
          value={bilingualEmphasis}
          onChange={setBilingualEmphasis}
        />
      </div>
    </div>
  );
}
