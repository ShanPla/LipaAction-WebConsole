import { PriorityBadge, Badge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { cx } from "@/lib/utils";
import type { ValidationRecord } from "@/types";

const entryTierLabels: Record<ValidationRecord["entryTier"], string> = {
  emergency: "Emergency",
  other_reports: "Standard intake",
};

export function HistoryTable({
  records,
  // Distinguishes "this barangay has reviewed nothing yet" from "your filters
  // excluded everything" — the same empty table means two very different
  // things, and the second one is the user's own doing.
  isFiltered = false,
}: {
  records: ValidationRecord[];
  isFiltered?: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
        <p className="text-sm font-medium text-ink-700">
          {isFiltered ? "No records match these filters" : "No validation records yet"}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {isFiltered
            ? "Try a wider date range, or clear the outcome and official filters."
            : "Records appear here once reports in your barangay's queue have been confirmed or rejected."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-ink-100 bg-white shadow-panel">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
            <th className="px-4 py-2.5 font-semibold">Report</th>
            <th className="px-4 py-2.5 font-semibold">Category / Priority</th>
            <th className="px-4 py-2.5 font-semibold">Verdict</th>
            <th className="px-4 py-2.5 font-semibold">Validating official</th>
            <th className="px-4 py-2.5 font-semibold">Reporter</th>
            <th className="px-4 py-2.5 font-semibold">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.reportId}
              className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
            >
              <td className="px-4 py-3 font-mono text-xs text-ink-500">{record.reportId}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-700">{record.category}</span>
                  <PriorityBadge priority={record.priority} />
                </div>
                {/* Intake tier, kept as plain text so it can't be mistaken for
                    a second priority reading. */}
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {entryTierLabels[record.entryTier]}
                </p>
              </td>
              <td className="px-4 py-3 align-top">
                <Badge tone={record.verdict === "Confirmed" ? "success" : "warning"}>
                  {record.verdict === "Confirmed" ? "✓ Confirmed" : "✕ Rejected"}
                </Badge>
                {/* Rejection reason (incident_reports.review_reason). Only
                    rejected rows carry one — the RPC leaves it NULL on
                    validate — so this row is absent, not empty, otherwise. */}
                {record.reason && (
                  <p
                    className="mt-1 max-w-[220px] text-xs leading-snug text-ink-500"
                    title={record.reason}
                  >
                    {record.reason}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-ink-700">{record.validatingOfficial}</td>
              <td className="px-4 py-3">
                <ReporterChip reporter={record.reporter} />
              </td>
              <td
                className={cx(
                  "px-4 py-3 text-xs",
                  record.trustDelta ? "text-priority-critical" : "text-ink-500"
                )}
              >
                {record.timestamp}
                {record.trustDelta && (
                  <span className="ml-1.5 font-medium">({record.trustDelta} trust)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
