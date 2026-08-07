import { PriorityBadge, Badge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { cx } from "@/lib/utils";
import type { ValidationRecord } from "@/types";

const tierToPriority: Record<ValidationRecord["tier"], "Critical" | "High" | "Low"> = {
  Critical: "Critical",
  Standard: "High",
  Log: "Low",
};

export function HistoryTable({ records }: { records: ValidationRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
        <p className="text-sm font-medium text-ink-700">No validation records yet</p>
        <p className="mt-1 text-xs text-ink-500">
          Records appear here once reports in your barangay&apos;s queue have been confirmed or
          rejected.
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
            <th className="px-4 py-2.5 font-semibold">Category / Tier</th>
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
                  <PriorityBadge priority={tierToPriority[record.tier]} />
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={record.verdict === "Confirmed" ? "success" : "warning"}>
                  {record.verdict === "Confirmed" ? "✓ Confirmed" : "✕ Rejected"}
                </Badge>
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
