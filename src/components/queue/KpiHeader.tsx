import { Tile } from "@/components/ui/Tile";
import { formatDuration } from "@/lib/utils";
import type { KpiSummary } from "@/types";

export function KpiHeader({ summary }: { summary: KpiSummary }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Tile label="Fast-triage" value={summary.fastTriageCount} accent="critical" />
      <Tile label="Standard intake" value={summary.standardIntakeCount} />
      {/* "Median wait", not a bare "Median" — this is the median age of
          reports still pending, so the label has to say what is being
          measured. It is not the mockup's median resolution time; no
          resolution-time column exists yet. */}
      <Tile label="Median wait" value={formatDuration(summary.medianMinutes)} />
      <Tile label="Validated today" value={summary.validatedCount} accent="brand" />
    </div>
  );
}
