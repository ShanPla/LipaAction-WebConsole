"use client";

import { csvCell, cx, manilaTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT, type MessageKey } from "@/lib/i18n";
import type { ValidationRecord } from "@/types";

export type RangeFilter = "today" | "7d" | "all";
export type OutcomeFilter = "all" | "Confirmed" | "Rejected";

export const rangeOptions: { id: RangeFilter; label: MessageKey }[] = [
  { id: "today", label: "history.range.today" },
  { id: "7d", label: "history.range.7d" },
  { id: "all", label: "history.range.all" },
];

const outcomeOptions: { id: OutcomeFilter; label: MessageKey }[] = [
  { id: "all", label: "history.outcome.all" },
  { id: "Confirmed", label: "history.outcome.Confirmed" },
  { id: "Rejected", label: "history.outcome.Rejected" },
];

// Controlled — ValidationHistoryClient owns the state and does the actual
// filtering, so the table and these chips can never disagree about what's
// being shown. Every option here filters the rows already fetched by
// getValidationHistory(); none of them re-query.
//
// "All officials" used to sit in the range group alongside Today/Last 7d,
// which mixed two unrelated dimensions into one row of chips. It's now its
// own select, populated from the officials actually present in the data.
export function HistoryFilters({
  range,
  outcome,
  official,
  officialOptions,
  onRangeChange,
  onOutcomeChange,
  onOfficialChange,
  records,
}: {
  range: RangeFilter;
  outcome: OutcomeFilter;
  official: string;
  officialOptions: string[];
  onRangeChange: (value: RangeFilter) => void;
  onOutcomeChange: (value: OutcomeFilter) => void;
  onOfficialChange: (value: string) => void;
  records: ValidationRecord[];
}) {
  const { showToast } = useToast();
  const t = useT();

  function handleExport() {
    if (records.length === 0) {
      showToast(t("history.exportNothing"), "info");
      return;
    }
    downloadCsv(records);
    showToast(t("history.exported", { count: records.length }), "success");
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {rangeOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onRangeChange(opt.id)}
            aria-pressed={range === opt.id}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              range === opt.id
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            )}
          >
            {t(opt.label)}
          </button>
        ))}

        <select
          aria-label={t("history.filterOutcome")}
          value={outcome}
          onChange={(e) => onOutcomeChange(e.target.value as OutcomeFilter)}
          className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
        >
          {outcomeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t(opt.label)}
            </option>
          ))}
        </select>

        {/* Only worth showing once more than one official appears in the data —
            a single-entry dropdown is just noise. */}
        {officialOptions.length > 1 && (
          <select
            aria-label={t("history.filterOfficial")}
            value={official}
            onChange={(e) => onOfficialChange(e.target.value)}
            className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
          >
            <option value="all">{t("history.allOfficials")}</option>
            {officialOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={handleExport}>
        {t("history.export")}
      </Button>
    </div>
  );
}

// Exports exactly what's on screen (current filters included), not a fresh
// server query — so the file always matches what the official was looking at
// when they clicked.
//
// Always in English, whatever the interface language: the file is read by
// other offices, and its column names are what the verified export was
// checked against.
//
// The reporter column carries "Verified reporter" / "Identity withheld" only,
// never a name — same privacy rule as the table itself. Nothing here widens
// what leaves the system.
function downloadCsv(records: ValidationRecord[]) {
  const header = [
    "Report ID",
    "Category",
    "Priority",
    "Entry tier",
    "Verdict",
    "Reason",
    "Validating official",
    "Reporter",
    "Reviewed at",
  ];

  const rows = records.map((r) => [
    r.reportId,
    r.category,
    // A blank cell would read as missing data; the words say what it is.
    r.priority ?? "Not scored",
    r.entryTier,
    r.verdict,
    r.reason ?? "",
    r.validatingOfficial,
    r.reporter.name,
    // Manila, like the table above it. The raw column is UTC, so exporting
    // it unchanged put every review eight hours earlier than the screen
    // said. The +08:00 offset is kept so the value stays unambiguous.
    manilaTimestamp(r.reviewedAt),
  ]);

  // csvCell, not plain quoting: it also neutralises cells a spreadsheet would
  // run as a formula. Three of these columns hold text other people typed.
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  // ﻿ (BOM) so Excel opens it as UTF-8 — without it, a rejection reason
  // typed in Filipino renders as mojibake.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // Dated in Manila: toISOString() is UTC, so an export made before 8am
  // was named for the previous day.
  link.download = `validation-history-${manilaTimestamp(new Date().toISOString()).slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoked on the next tick, not immediately: some browsers start the
  // download asynchronously after click(), and revoking first cancels it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

