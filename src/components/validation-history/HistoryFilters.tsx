"use client";

import { cx } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ValidationRecord } from "@/types";

export type RangeFilter = "today" | "7d" | "all";
export type OutcomeFilter = "all" | "Confirmed" | "Rejected";

export const rangeOptions: { id: RangeFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7d" },
  { id: "all", label: "All time" },
];

const outcomeOptions: { id: OutcomeFilter; label: string }[] = [
  { id: "all", label: "All outcomes" },
  { id: "Confirmed", label: "Confirmed" },
  { id: "Rejected", label: "Rejected" },
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

  function handleExport() {
    if (records.length === 0) {
      showToast("Nothing to export with these filters", "info");
      return;
    }
    downloadCsv(records);
    showToast(`Exported ${records.length} records as CSV`, "success");
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
            {opt.label}
          </button>
        ))}

        <select
          aria-label="Filter by outcome"
          value={outcome}
          onChange={(e) => onOutcomeChange(e.target.value as OutcomeFilter)}
          className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
        >
          {outcomeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Only worth showing once more than one official appears in the data —
            a single-entry dropdown is just noise. */}
        {officialOptions.length > 1 && (
          <select
            aria-label="Filter by validating official"
            value={official}
            onChange={(e) => onOfficialChange(e.target.value)}
            className="rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs font-medium text-ink-700"
          >
            <option value="all">All officials</option>
            {officialOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={handleExport}>
        Export CSV
      </Button>
    </div>
  );
}

// Exports exactly what's on screen (current filters included), not a fresh
// server query — so the file always matches what the official was looking at
// when they clicked.
//
// The reporter column carries "Verified reporter" / "Identity withheld" only,
// never a name — same privacy rule as the table itself. Nothing here widens
// what leaves the system.
function downloadCsv(records: ValidationRecord[]) {
  const header = [
    "Report ID",
    "Category",
    "Tier",
    "Verdict",
    "Reason",
    "Validating official",
    "Reporter",
    "Reviewed at",
  ];

  const rows = records.map((r) => [
    r.reportId,
    r.category,
    r.tier,
    r.verdict,
    r.reason ?? "",
    r.validatingOfficial,
    r.reporter.name,
    r.reviewedAt,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");

  // ﻿ (BOM) so Excel opens it as UTF-8 — without it, a rejection reason
  // typed in Filipino renders as mojibake.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `validation-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string): string {
  // Wrap in quotes and double any inner quote — rejection reasons are free
  // text and will contain commas, quotes, and newlines.
  return `"${value.replace(/"/g, '""')}"`;
}
