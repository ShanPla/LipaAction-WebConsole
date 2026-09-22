"use client";

import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { useLang, useT } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import type { ClusterExplorerEntry } from "@/types";

/**
 * Read-only member list. Three controls from the mockup used to sit in the
 * header — [Wrong duplicate match], [Split into separate clusters], [Merge
 * selected] — each firing a toast that claimed the change had been made
 * while writing nothing. Removed rather than wired: cluster membership is
 * incident_reports.cluster_id, which no barangay role can write, and nothing
 * populates it yet anyway (the dedup flagger never writes back). When
 * write-back ships, a recomputation pass would undo a manual split unless a
 * pin/override design exists — it doesn't. Re-add only with a backend path.
 * Same reasoning as ClusterCard's removed [Split into commitments].
 */
export function MemberPanel({
  cluster,
  // The page's clock, so member ages keep moving; null on the first render,
  // which shows the server's own strings.
  now = null,
}: {
  cluster: ClusterExplorerEntry;
  now?: number | null;
}) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="flex flex-col gap-2 border-b border-ink-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {t("cluster.member.title", { id: cluster.id, category: cluster.category, count: cluster.memberCount })}
          </p>
          <p className="text-xs text-ink-500">{cluster.centroidLabel}</p>
        </div>
        <p className="text-xs text-ink-500">
          {t("cluster.member.where")}
          {/* The English screen keeps the mockup's Tagalog hint. */}
          {lang === "en" && <> &middot; Mga aksyon sa Queue</>}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {cluster.members.map((member, idx) => (
          <div
            key={member.reportId}
            className="border-b border-ink-100 px-4 py-3 last:border-0"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-500">{member.reportId}</span>
              <PriorityBadge priority={member.priority} />
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                {member.relationship === "Primary" ? t("cluster.member.primary") : t("cluster.member.related")}
              </span>
              <span className="text-xs text-ink-500">
                {now === null ? member.timestamp : timeAgo(member.submittedAt, now)}
              </span>
            </div>
            <div className="mb-1.5">
              <ReporterChip reporter={member.reporter} />
            </div>
            {idx > 0 && (member.visualHash || member.temporalDeltaSeconds || member.sitio) && (
              <div className="flex flex-wrap gap-3 rounded-md bg-ink-50 px-2.5 py-1.5 text-[11px] text-ink-500">
                {member.visualHash !== undefined && (
                  <span>{t("cluster.signal.visualHash", { value: member.visualHash.toFixed(2) })}</span>
                )}
                {member.temporalDeltaSeconds !== undefined && (
                  <span>
                    {t("cluster.signal.temporal", {
                      minutes: Math.floor(member.temporalDeltaSeconds / 60),
                      seconds: member.temporalDeltaSeconds % 60,
                    })}
                  </span>
                )}
                {member.sitio && <span>{t("cluster.signal.sitio", { sitio: member.sitio })}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
