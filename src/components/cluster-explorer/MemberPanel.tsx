import { PriorityBadge } from "@/components/ui/Badge";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { Button } from "@/components/ui/Button";
import type { ClusterExplorerEntry } from "@/types";

export function MemberPanel({ cluster }: { cluster: ClusterExplorerEntry }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-card border border-ink-100 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {cluster.id} &middot; {cluster.category}, {cluster.memberCount} reports clustered
          </p>
          <p className="text-xs text-ink-500">{cluster.centroidLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Wrong duplicate match
          </Button>
          <Button variant="secondary" size="sm">
            Split into separate clusters
          </Button>
          <Button variant="primary" size="sm">
            Merge selected
          </Button>
        </div>
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
                {member.relationship}
              </span>
              <span className="text-xs text-ink-500">{member.timestamp}</span>
            </div>
            <div className="mb-1.5">
              <ReporterChip reporter={member.reporter} />
            </div>
            {idx > 0 && (member.visualHash || member.temporalDeltaSeconds || member.sitio) && (
              <div className="flex flex-wrap gap-3 rounded-md bg-ink-50 px-2.5 py-1.5 text-[11px] text-ink-500">
                {member.visualHash !== undefined && (
                  <span>Visual hash {member.visualHash.toFixed(2)}</span>
                )}
                {member.temporalDeltaSeconds !== undefined && (
                  <span>
                    Temporal &Delta; {Math.floor(member.temporalDeltaSeconds / 60)}m{" "}
                    {member.temporalDeltaSeconds % 60}s
                  </span>
                )}
                {member.sitio && <span>{member.sitio} radius</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
