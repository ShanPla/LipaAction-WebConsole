import { Tile } from "@/components/ui/Tile";
import type { AuditSummary } from "@/types";

export function AuditSummaryTiles({ summary }: { summary: AuditSummary }) {
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      <Tile label="Total events" value={summary.totalEvents} />
      <Tile label="State-changing actions" value={summary.stateChangingActions} accent="brand" />
      <Tile label="PII-access events" value={summary.piiAccessEvents} accent="critical" />
      <Tile label="Unique actors" value={summary.uniqueActors} />
    </div>
  );
}
