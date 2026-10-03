"use client";

import Link from "next/link";
import { ACTION_LABELS, ROLE_LABELS } from "@/components/audit-log/AuditTable";
import { buttonClassName } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
// Type-only import from a server-only module — erased at compile time.
import type { RecentActivityData } from "@/lib/data/auditLog";

/**
 * The barangay admin's recent-activity list (A.3.1): the newest few events
 * on this barangay's reports, by role, as on the Audit Log page, which the
 * link opens. Below the queue, so it never sits between an official and the
 * reports waiting for a decision.
 */
export function RecentActivity({ data }: { data: RecentActivityData }) {
  const t = useT();
  return (
    <section aria-labelledby="recent-activity-title" className="mt-6 rounded-card border border-ink-100 bg-white px-4 py-3 shadow-panel">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="recent-activity-title" className="text-sm font-semibold text-ink-900">
            {t("queue.activity.title")}
          </h2>
          <p className="text-xs text-ink-500">{t("queue.activity.intro")}</p>
        </div>
        <Link href="/audit-log" className={buttonClassName("secondary", "sm")}>
          {t("queue.activity.viewAll")}
        </Link>
      </div>
      {data.failed ? (
        <p role="status" className="text-xs text-ink-500">{t("queue.activity.failed")}</p>
      ) : data.entries.length === 0 ? (
        <p className="text-xs text-ink-500">{t("queue.activity.empty")}</p>
      ) : (
        <ul className="divide-y divide-ink-100">
          {data.entries.map((e) => {
            const action = ACTION_LABELS[e.action];
            const role = ROLE_LABELS[e.actorRole];
            return (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-xs">
                <span className="font-mono text-ink-500">{e.timestamp}</span>
                <span className="font-medium text-ink-900">{action ? t(action) : e.action}</span>
                <span className="text-ink-700">{role ? t(role) : e.actorRole || "—"}</span>
                {e.category && <span className="text-ink-500">{e.category}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
