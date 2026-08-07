import { Tile } from "@/components/ui/Tile";
import type { KpiSummary } from "@/types";

export function KpiHeader({ summary }: { summary: KpiSummary }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Tile label="Fast-triage" value={summary.fastTriageCount} accent="critical" />
      <Tile label="Standard intake" value={summary.standardIntakeCount} />
      <Tile label="Median" value={`${summary.medianMinutes} min`} />
      <Tile label="Validated today" value={summary.validatedCount} accent="brand" />
    </div>
  );
}
