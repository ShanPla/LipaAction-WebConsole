import { Tile } from "@/components/ui/Tile";
import type { ValidationSummary } from "@/types";

export function SummaryTiles({ summary }: { summary: ValidationSummary }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <Tile label="Total" value={summary.total} />
      <Tile label="Confirmed" value={summary.confirmed} accent="brand" />
      <Tile label="Confirmed-false" value={summary.confirmedFalse} accent="critical" />
      <Tile label="Identity withheld" value={summary.identityWithheld} />
    </div>
  );
}
