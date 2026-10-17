import { PriorityBadge, Badge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import type { ValidationRecord } from "@/types";
import { RESOLUTION_LABELS } from "./historyOptions";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyIdButton } from "@/components/ui/CopyIdButton";

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
  const t = useT();
  if (records.length === 0) {
    return (
      <EmptyState icon="history">
        <p className="text-sm font-medium text-ink-700">
          {t(isFiltered ? "history.empty.filteredTitle" : "history.empty.title")}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {t(isFiltered ? "history.empty.filteredBody" : "history.empty.body")}
        </p>
      </EmptyState>
    );
  }

  // One card per decided report, like the queue's: priority, category and
  // verdict first, what became of it, who decided it and when, the reporter
  // label, and the id last with a copy button.
  return (
    <ul aria-label={t("history.caption")} className="space-y-3">
      {records.map((record) => (
        <li
          key={record.reportId}
          className="break-inside-avoid rounded-card border border-ink-100 bg-white shadow-panel"
        >
          <div className="px-4 pb-3 pt-4 sm:px-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={record.priority} />
              <span className="text-base font-semibold text-ink-900">{record.category}</span>
              <Badge tone={record.verdict === "Confirmed" ? "success" : "warning"}>
                {/* The icon repeats the word, so the verdict is never
                    carried by the badge colour alone. */}
                <Icon name={record.verdict === "Confirmed" ? "check" : "close"} className="mr-1 h-3 w-3" />
                {t(record.verdict === "Confirmed" ? "history.verdict.confirmed" : "history.verdict.rejected")}
              </Badge>
              {/* Intake tier, kept as plain text so it can't be mistaken for
                  a second priority reading. */}
              <span className="text-xs text-ink-500">{t(`history.tier.${record.entryTier}`)}</span>
            </div>

            {/* What became of a confirmed report since: still with an
                agency, resolved, sent back. Absent on a rejection, and when
                the agency rows couldn't be read. */}
            {record.resolution && (
              <p className="text-sm text-ink-700">{t(RESOLUTION_LABELS[record.resolution])}</p>
            )}
            {/* What the desk wrote when it closed the report itself. */}
            {record.resolutionNote && (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-ink-700">
                {record.resolutionNote}
              </p>
            )}
            {/* Rejection reason (incident_reports.review_reason). Only
                rejected rows carry one — the RPC leaves it NULL on validate —
                so this block is absent, not empty, otherwise. The category is
                parsed from the reason's prefix; a reason without one shows
                its text alone. */}
            {record.reason && (
              <div className="mt-1 text-sm leading-snug text-ink-700">
                {record.reasonCode && (
                  <p className="font-medium text-ink-900">{t(`rejectReason.${record.reasonCode}`)}</p>
                )}
                {record.reasonNote && <p>{record.reasonNote}</p>}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
              <span>
                {/* A record CDRRMO decided already reads [Validated by CDRRMO]
                    or [Rejected by CDRRMO], so it takes no label. */}
                {record.decidedBy !== "cdrrmo" && (
                  <span className="text-ink-500">{t("history.col.official")}: </span>
                )}
                {record.officialIsBarangayGeneric ? t("history.yourBarangay") : record.validatingOfficial}
              </span>
              <span aria-hidden className="text-ink-300">·</span>
              <span className={cx(record.trustDelta ? "text-priority-critical" : "text-ink-500")}>
                {t("history.reviewedAt")} {record.timestamp}
                {record.trustDelta && (
                  <span className="ml-1.5 font-medium">{t("history.trust", { delta: record.trustDelta })}</span>
                )}
              </span>
            </div>
            <div className="mt-2">
              <ReporterChip reporter={record.reporter} />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-ink-100 pl-4 pr-2 sm:pl-5">
            <span className="shrink-0 text-xs text-ink-500">{t("row.reportId")}</span>
            <span className="min-w-0 truncate font-mono text-xs text-ink-500">{record.reportId}</span>
            <span className="print:hidden">
              <CopyIdButton id={record.reportId} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
