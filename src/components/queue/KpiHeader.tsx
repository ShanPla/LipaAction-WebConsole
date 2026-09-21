import { Tile } from "@/components/ui/Tile";
import { formatDuration } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { KpiSummary } from "@/types";

export function KpiHeader({ summary }: { summary: KpiSummary }) {
  const t = useT();
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Tile label={t("queue.kpi.fastTriage")} value={summary.fastTriageCount} accent="critical" />
      <Tile label={t("queue.kpi.standard")} value={summary.standardIntakeCount} />
      {/* "Median wait", not a bare "Median" — this is the median age of
          reports still pending, so the label has to say what is being
          measured. It is not the mockup's median resolution time; no
          resolution-time column exists yet. */}
      <Tile label={t("queue.kpi.medianWait")} value={formatDuration(summary.medianMinutes)} />
      <Tile label={t("queue.kpi.validatedToday")} value={summary.validatedCount ?? "—"} accent="brand" />
    </div>
  );
}
