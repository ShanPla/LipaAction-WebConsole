"use client";

import { useState, useTransition } from "react";
import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateReportStatus } from "@/app/actions/reports";
import type { QueueReport } from "@/types";

export function ReportRow({ report }: { report: QueueReport }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<"validated" | "rejected" | null>(null);

  function handleAction(status: "validated" | "rejected") {
    startTransition(async () => {
      const result = await updateReportStatus(report.id, status);
      if (result.success) {
        setResolved(status);
        showToast(
          status === "validated" ? `${report.id} validated` : `${report.id} rejected`,
          status === "validated" ? "success" : "danger"
        );
      } else {
        showToast(result.message ?? "Failed to update report", "danger");
      }
    });
  }

  if (resolved) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-500 last:border-0">
        <span className="font-mono text-xs">{report.id}</span>
        <span>
          {resolved === "validated" ? "Validated — moved to Recent validated" : "Rejected"}
        </span>
      </div>
    );
  }

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
          {report.location && (
            <>
              <span>{report.location}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{report.timestamp}</span>
          <span aria-hidden>·</span>
          <ReporterChip reporter={report.reporter} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("rejected")}
        >
          Reject
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("validated")}
        >
          Validate
        </Button>
      </div>
    </div>
  );
}
