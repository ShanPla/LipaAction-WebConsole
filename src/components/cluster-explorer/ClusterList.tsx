import { cx } from "@/lib/utils";
import type { ClusterExplorerEntry } from "@/types";

const statusStyles: Record<string, string> = {
  Critical: "text-priority-critical",
  High: "text-priority-high",
  Standard: "text-ink-500",
};

export function ClusterList({
  clusters,
  activeId,
  onSelect,
}: {
  clusters: ClusterExplorerEntry[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="border-b border-ink-100 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Clusters &middot; {clusters.length}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {clusters.map((cluster) => {
          const active = cluster.id === activeId;
          return (
            <button
              key={cluster.id}
              onClick={() => onSelect(cluster.id)}
              className={cx(
                "flex w-full flex-col items-start gap-0.5 border-b border-ink-100 px-3 py-2.5 text-left transition-colors last:border-0",
                active ? "bg-brand-50" : "hover:bg-ink-50"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-mono text-xs text-ink-500">{cluster.id}</span>
                <span
                  className={cx(
                    "text-[11px] font-semibold",
                    statusStyles[cluster.status]
                  )}
                >
                  {cluster.status}
                </span>
              </div>
              <span className="text-sm font-medium text-ink-900">{cluster.category}</span>
              <span className="text-xs text-ink-500">
                {cluster.memberCount} members &middot; {cluster.radiusMeters}m radius
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
