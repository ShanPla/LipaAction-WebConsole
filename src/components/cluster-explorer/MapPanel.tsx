"use client";

import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { ClusterExplorerEntry } from "@/types";

// Dot colour by tier, from the priority tokens; an unscored report is neutral.
const dotFill: Record<string, string> = {
  Critical: "fill-priority-critical",
  High: "fill-priority-high",
  Medium: "fill-priority-medium",
  Low: "fill-priority-low",
};

/**
 * A schematic, not a map. No position is stored for a cluster, and the
 * report's own point (geom) isn't read by this console, so the members are
 * placed evenly round a circle. That used to be said only in the aria-label,
 * and a sighted reader took the dots for real positions; the caption under
 * the drawing now says it too.
 */
export function MapPanel({ cluster }: { cluster: ClusterExplorerEntry }) {
  const t = useT();
  const memberCount = cluster.members.length;

  return (
    <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel lg:w-72">
      <div className="border-b border-ink-100 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{t("cluster.map.title")}</p>
        <p className="text-xs text-ink-500">
          {cluster.radiusMeters !== undefined
            ? t("cluster.map.radius", { meters: cluster.radiusMeters })
            : t("cluster.map.noExtent")}
        </p>
      </div>

      <div className="relative flex-1 bg-ink-50">
        <svg viewBox="0 0 240 240" className="h-full w-full" role="img" aria-label={t("cluster.map.aria")}>
          <rect width="240" height="240" className="fill-ink-50" />
          {/* road-like guide lines to suggest a map without claiming real geodata */}
          <line x1="0" y1="120" x2="240" y2="120" className="stroke-ink-100" strokeWidth="2" />
          <line x1="120" y1="0" x2="120" y2="240" className="stroke-ink-100" strokeWidth="2" />
          <circle
            cx="120"
            cy="120"
            r="70"
            className="fill-brand-500 stroke-brand-500"
            fillOpacity="0.12"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
          <circle cx="120" cy="120" r="4" className="fill-brand-500" />
          {cluster.members.map((member, idx) => {
            const angle = (idx / Math.max(memberCount, 1)) * Math.PI * 2;
            const r = 45;
            const x = 120 + r * Math.cos(angle);
            const y = 120 + r * Math.sin(angle);
            return (
              <circle
                key={member.reportId}
                cx={x}
                cy={y}
                r="6"
                className={cx("stroke-white", member.priority ? dotFill[member.priority] : "fill-ink-300")}
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>

      <div className="border-t border-ink-100 px-3 py-2.5 text-[11px] text-ink-500">
        <p>{t("cluster.map.schematic")}</p>
        {/* The loader fills this with the barangay's name: nothing computes a
            centroid, so it isn't labelled one. */}
        <p className="mt-1">{t("cluster.map.area", { name: cluster.centroidLabel })}</p>
      </div>
    </div>
  );
}
