import { Tile } from "@/components/ui/Tile";
import { useT } from "@/lib/i18n";
import type { AuditSummary } from "@/types";

export function AuditSummaryTiles({ summary }: { summary: AuditSummary }) {
  const t = useT();
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      <Tile label={t("audit.tile.total")} value={summary.totalEvents} />
      <Tile label={t("audit.tile.stateChanging")} value={summary.stateChangingActions} accent="brand" />
      <Tile label={t("audit.tile.pii")} value={summary.piiAccessEvents} accent="critical" />
      <Tile label={t("audit.tile.actors")} value={summary.uniqueActors} />
    </div>
  );
}
