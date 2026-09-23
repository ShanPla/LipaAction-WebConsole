"use client";

import { cx } from "@/lib/utils";
import { useT, type MessageKey } from "@/lib/i18n";

/** Which actions a chip keeps. Empty means every action. */
export const AUDIT_FILTERS = {
  all: [],
  decisions: ["report_validated", "report_rejected"],
  routings: ["report_routed_manual"],
  openings: ["report_viewed"],
} as const;

export type AuditFilterId = keyof typeof AUDIT_FILTERS;

const LABELS: Record<AuditFilterId, MessageKey> = {
  all: "audit.filter.all",
  decisions: "audit.filter.decisions",
  routings: "audit.filter.routings",
  openings: "audit.filter.openings",
};

/**
 * Real filters now, over the events already loaded — the read function has
 * no action argument, and asking for one later would mean dropping and
 * recreating a live function, so the page filters its own window and the
 * note beside the chips says that is what it does.
 *
 * These chips replace mockup ones that highlighted and filtered nothing, and
 * an [Export CSV] button that claimed to export fixture rows.
 */
export function AuditFilters({
  active,
  onChange,
}: {
  active: AuditFilterId;
  onChange: (id: AuditFilterId) => void;
}) {
  const t = useT();

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(AUDIT_FILTERS) as AuditFilterId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            onClick={() => onChange(id)}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active === id
                ? "bg-brand-500 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            )}
          >
            {t(LABELS[id])}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-500">{t("audit.filterNote")}</p>
    </div>
  );
}
