import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { Button } from "@/components/ui/Button";
import type { QueueReport } from "@/types";

export function ReportRow({ report }: { report: QueueReport }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-ink-50/60">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-ink-500">{report.id}</span>
          <PriorityBadge priority={report.priority} />
          <span className="text-xs font-medium text-ink-700">{report.category}</span>
        </div>
        <p className="mb-1.5 truncate text-sm text-ink-900">{report.summary}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
          <span>{report.location}</span>
          <span aria-hidden>·</span>
          <span>{report.timestamp}</span>
          <span aria-hidden>·</span>
          <ReporterChip reporter={report.reporter} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm">
          Reject
        </Button>
        <Button variant="primary" size="sm">
          Validate
        </Button>
      </div>
    </div>
  );
}
