"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SummaryTiles } from "@/components/validation-history/SummaryTiles";
import {
  HistoryFilters,
  type OutcomeFilter,
  type RangeFilter,
} from "@/components/validation-history/HistoryFilters";
import { HistoryTable } from "@/components/validation-history/HistoryTable";
// Type-only — validationHistory.ts is "server-only", so importing any runtime
// value from it here would pull it into the client bundle. The row cap arrives
// as data (historyData.limit) instead.
import type { ValidationHistoryData } from "@/lib/data/validationHistory";
import type { OfficialProfile } from "@/lib/auth";
import type { ValidationRecord, ValidationSummary } from "@/types";

export function ValidationHistoryClient({
  official,
  historyData,
}: {
  official: OfficialProfile;
  historyData: ValidationHistoryData;
}) {
  const { summary: loadedSummary, records, limit } = historyData;

  const [range, setRange] = useState<RangeFilter>("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [validatingOfficial, setValidatingOfficial] = useState("all");

  // Built from the full loaded set, not the filtered one — otherwise the
  // dropdown would shed its own options as soon as you picked one.
  const officialOptions = useMemo(
    () => [...new Set(records.map((r) => r.validatingOfficial))].sort(),
    [records]
  );

  const filtered = useMemo(
    () => records.filter((r) => matchesRange(r, range) && matchesOutcome(r, outcome) && matchesOfficial(r, validatingOfficial)),
    [records, range, outcome, validatingOfficial]
  );

  // Tiles describe what's actually on screen. Showing the loaded-set counts
  // above a filtered table would make the two contradict each other.
  const visibleSummary = useMemo(() => summarize(filtered), [filtered]);

  const isFiltered = filtered.length !== records.length;
  const isCapped = records.length === limit;

  return (
    <AppShell breadcrumb={[official.barangayName, "Validation History"]} official={official}>
      <SummaryTiles summary={visibleSummary} />
      <HistoryFilters
        range={range}
        outcome={outcome}
        official={validatingOfficial}
        officialOptions={officialOptions}
        onRangeChange={setRange}
        onOutcomeChange={setOutcome}
        onOfficialChange={setValidatingOfficial}
        records={filtered}
      />
      <HistoryTable records={filtered} isFiltered={isFiltered} />

      {records.length > 0 && (
        <p className="mt-3 text-xs text-ink-500">
          {isFiltered
            ? `Showing ${filtered.length} of ${loadedSummary.total} loaded records`
            : `Showing the ${records.length} most recent reviewed ${
                records.length === 1 ? "report" : "reports"
              } for ${official.barangayName}`}
          {" · newest first"}
          {/* Filtering happens over the rows already fetched, so a barangay
              past the cap can have in-range records that never reached the
              browser. Say so rather than implying the filtered count is
              complete. */}
          {isCapped && ` · capped at the ${limit} most recent, so filters apply to those only`}
        </p>
      )}
    </AppShell>
  );
}

function matchesOutcome(record: ValidationRecord, outcome: OutcomeFilter): boolean {
  return outcome === "all" || record.verdict === outcome;
}

function matchesOfficial(record: ValidationRecord, official: string): boolean {
  return official === "all" || record.validatingOfficial === official;
}

function matchesRange(record: ValidationRecord, range: RangeFilter): boolean {
  if (range === "all") return true;

  const reviewed = new Date(record.reviewedAt).getTime();
  if (Number.isNaN(reviewed)) return false;

  if (range === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return reviewed >= startOfToday.getTime();
  }

  return reviewed >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function summarize(records: ValidationRecord[]): ValidationSummary {
  return {
    total: records.length,
    confirmed: records.filter((r) => r.verdict === "Confirmed").length,
    confirmedFalse: records.filter((r) => r.verdict === "Rejected").length,
    identityWithheld: records.filter((r) => r.reporter.identityWithheld).length,
  };
}
