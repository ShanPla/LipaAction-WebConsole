"use client";

import { Badge } from "@/components/ui/Badge";
import { useT, type MessageKey } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import type { AuditLogEntry } from "@/types";

// The four actions this function can return. Anything else renders as the
// raw action text rather than disappearing: the column is text by contract,
// not an enum, so a new backend action must still be readable here.
const ACTION_LABELS: Record<string, MessageKey> = {
  report_viewed: "audit.action.report_viewed",
  report_validated: "audit.action.report_validated",
  report_rejected: "audit.action.report_rejected",
  report_routed_manual: "audit.action.report_routed_manual",
};

const ACTION_TONES: Record<string, "neutral" | "brand" | "warning"> = {
  report_viewed: "neutral",
  report_validated: "brand",
  report_rejected: "warning",
  report_routed_manual: "brand",
};

// Same rule for roles: the four that can appear get a label, an unknown one
// shows as itself.
const ROLE_LABELS: Record<string, MessageKey> = {
  barangay_official: "role.barangay_official",
  barangay_admin: "role.barangay_admin",
  senior_barangay_admin: "role.senior_barangay_admin",
  municipal_admin: "role.municipal_admin",
};

export function AuditTable({
  entries,
  filtered,
}: {
  entries: AuditLogEntry[];
  /** True when a chip is narrowing the list, so the empty state can say so. */
  filtered: boolean;
}) {
  const t = useT();

  if (entries.length === 0) {
    return (
      <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
        <p className="text-sm font-medium text-ink-700">{t("audit.empty.title")}</p>
        <p className="mt-1 text-xs text-ink-500">
          {filtered ? t("audit.empty.filtered") : t("audit.empty.body")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-brand-50 px-4 py-2 text-xs text-brand-700">
        <Icon name="lock" className="h-3.5 w-3.5" />
        {t("audit.readOnly")}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{t("audit.caption")}</caption>
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("field.timestamp")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.action")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.role")}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.report")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const actionKey = ACTION_LABELS[entry.action];
              const roleKey = ROLE_LABELS[entry.actorRole];
              return (
                <tr key={entry.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-500">
                    {entry.timestamp}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ACTION_TONES[entry.action] ?? "neutral"}>
                      {actionKey ? t(actionKey) : entry.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-700">
                    {roleKey ? t(roleKey) : entry.actorRole || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {entry.reportId ? (
                      <div className="leading-tight">
                        <p className="font-mono text-xs text-ink-700">{entry.reportId}</p>
                        {entry.category && (
                          <p className="text-[11px] text-ink-500">{entry.category}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-500">{t("audit.reportGone")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
