import { AppShell } from "@/components/layout/AppShell";
import { SummaryTiles } from "@/components/validation-history/SummaryTiles";
import { HistoryFilters } from "@/components/validation-history/HistoryFilters";
import { HistoryTable } from "@/components/validation-history/HistoryTable";
import type { ValidationHistoryData } from "@/lib/data/validationHistory";
import type { OfficialProfile } from "@/lib/auth";

export function ValidationHistoryClient({
  official,
  historyData,
}: {
  official: OfficialProfile;
  historyData: ValidationHistoryData;
}) {
  const { summary, records } = historyData;

  return (
    <AppShell breadcrumb={[official.barangayName, "Validation History"]} official={official}>
      <SummaryTiles summary={summary} />
      <HistoryFilters total={summary.total} />
      <HistoryTable records={records} />
      {records.length > 0 && (
        <p className="mt-3 text-xs text-ink-500">
          {/* The query is capped at 50 rows, so this is deliberately NOT phrased
              as "X of <all-time total>" or "last 7 days" — neither is what was
              actually fetched. */}
          Showing the {records.length} most recent reviewed{" "}
          {records.length === 1 ? "report" : "reports"} for {official.barangayName} &middot;
          newest first
        </p>
      )}
    </AppShell>
  );
}
