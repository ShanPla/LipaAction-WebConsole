import { Badge } from "@/components/ui/Badge";
import { cx, initials } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

const actionToneMap: Record<AuditLogEntry["actionType"], "neutral" | "brand" | "warning"> = {
  Validate: "brand",
  Reassign: "warning",
  "Cluster action": "warning",
  Export: "neutral",
  Login: "neutral",
  Dispatch: "brand",
  Recall: "warning",
};

export function AuditTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-brand-50 px-4 py-2 text-xs text-brand-700">
        <span aria-hidden>🔒</span>
        Read-only audit trail &mdash; every category and assignment write appends an immutable
        row.
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
            <th className="px-4 py-2.5 font-semibold">Timestamp</th>
            <th className="px-4 py-2.5 font-semibold">Actor</th>
            <th className="px-4 py-2.5 font-semibold">Action</th>
            <th className="px-4 py-2.5 font-semibold">Affected entity</th>
            <th className="px-4 py-2.5 font-semibold">Before &rarr; After</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-500">
                {entry.timestamp}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-700">
                    {entry.actorName === "System" ? "⚙" : initials(entry.actorName)}
                  </span>
                  <div className="leading-tight">
                    <p className="text-xs font-medium text-ink-900">{entry.actorName}</p>
                    <p className="text-[11px] text-ink-500">{entry.actorRole}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={actionToneMap[entry.actionType]}>{entry.actionType}</Badge>
                {entry.isPiiAccess && (
                  <span className="ml-1.5 text-[10px] font-medium text-priority-critical">
                    PII
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-ink-700">{entry.affectedEntity}</td>
              <td
                className={cx(
                  "px-4 py-3 font-mono text-xs",
                  entry.isPiiAccess ? "text-priority-critical" : "text-ink-500"
                )}
              >
                {entry.beforeAfterDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
