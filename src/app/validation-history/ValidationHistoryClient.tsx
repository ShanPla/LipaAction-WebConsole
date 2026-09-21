"use client";

import { useMemo, useState } from "react";
import { startOfManilaDay } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { SummaryTiles } from "@/components/validation-history/SummaryTiles";
import {
  HistoryFilters,
  type OutcomeFilter,
  type RangeFilter,
} from "@/components/validation-history/HistoryFilters";
import { HistoryTable } from "@/components/validation-history/HistoryTable";
import { DataUnavailableBanner } from "@/components/layout/DataUnavailableBanner";
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
  const { summary: loadedSummary, records, limit, loadFailed } = historyData;
  const t = useT();

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
    <AppShell breadcrumb={[official.barangayName, t("nav.validationHistory")]} official={official}>
      {loadFailed && <DataUnavailableBanner what={t("banner.what.history")} />}
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
            ? t("history.footer.filtered", { shown: filtered.length, total: loadedSummary.total })
            : records.length === 1
              ? t("history.footer.allOne", { barangay: official.barangayName })
              : t("history.footer.all", { count: records.length, barangay: official.barangayName })}
          {` · ${t("history.footer.newest")}`}
          {/* Filtering happens over the rows already fetched, so a barangay
              past the cap can have in-range records that never reached the
              browser. Say so rather than implying the filtered count is
              complete. */}
          {isCapped && ` · ${t("history.footer.capped", { limit })}`}
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

  // Manila's day, not the browser's — the rows were stamped in Manila by the
  // server, and a laptop set to another zone must not shift the boundary.
  if (range === "today") {
    return reviewed >= startOfManilaDay().getTime();
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
