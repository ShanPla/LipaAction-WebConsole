import { AppShell } from "@/components/layout/AppShell";
import { SummaryTiles } from "@/components/validation-history/SummaryTiles";
import { HistoryFilters } from "@/components/validation-history/HistoryFilters";
import { HistoryTable } from "@/components/validation-history/HistoryTable";
import { validationRecords, validationSummary } from "@/data/mockValidationHistory";

export function ValidationHistoryClient() {
  return (
    <AppShell breadcrumb={["Brgy. Tambo", "Validation History"]}>
      <SummaryTiles summary={validationSummary} />
      <HistoryFilters />
      <HistoryTable records={validationRecords} />
      <p className="mt-3 text-xs text-ink-500">
        Showing {validationRecords.length} of {validationSummary.total} records &middot; last 7
        days
      </p>
    </AppShell>
  );
}
