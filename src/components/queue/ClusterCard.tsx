import { Button } from "@/components/ui/Button";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { PriorityBadge } from "@/components/ui/Badge";
import type { SituationCluster } from "@/types";

export function ClusterCard({ cluster }: { cluster: SituationCluster }) {
  return (
    <div className="mb-4 overflow-hidden rounded-card border border-priority-critical/30 bg-priority-criticalBg/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-priority-critical/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-priority-critical px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {cluster.label}
          </span>
          <span className="text-sm font-medium text-ink-900">
            {cluster.memberCount} reports across {cluster.barangaysAffected.length} barangays
          </span>
          {cluster.identityWithheldMembers > 0 && (
            <span className="text-xs text-ink-500">
              · {cluster.identityWithheldMembers} identity-withheld
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Split into commitments
          </Button>
          <Button variant="primary" size="sm">
            Validate as one cluster
          </Button>
        </div>
      </div>

      <p className="px-4 pt-2 text-xs text-ink-500">
        Mga aksyon &middot; pag-verify, pag-recall, at pag-merge
      </p>

      <div className="divide-y divide-priority-critical/10">
        {cluster.members.map((member) => (
          <div key={member.id} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-500">{member.id}</span>
                <PriorityBadge priority={member.priority} />
              </div>
              <p className="mb-1.5 truncate text-sm text-ink-900">{member.summary}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
                <span>{member.location}</span>
                <span aria-hidden>·</span>
                <span>{member.timestamp}</span>
                <span aria-hidden>·</span>
                <ReporterChip reporter={member.reporter} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
