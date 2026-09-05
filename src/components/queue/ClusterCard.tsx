"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { PriorityBadge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { validateReports } from "@/app/actions/reports";
import type { SituationCluster } from "@/types";

export function ClusterCard({ cluster }: { cluster: SituationCluster }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [resolved, setResolved] = useState(false);

  function handleValidateCluster() {
    startTransition(async () => {
      const { validated, failures } = await validateReports(cluster.members.map((m) => m.id));
      setShowConfirm(false);

      // Partial success is the normal case here, not an edge case: another
      // official can review one member between page load and this click. Say
      // exactly what happened rather than rounding it to success.
      if (failures.length === 0) {
        setResolved(true);
        showToast(`Validated all ${validated} reports in ${cluster.id}`, "success");
      } else if (validated > 0) {
        showToast(
          `Validated ${validated} of ${cluster.members.length} — ${failures.length} could not be validated`,
          "info"
        );
      } else {
        showToast(failures[0]?.message ?? "Could not validate this cluster", "danger");
      }
    });
  }

  if (resolved) {
    return (
      <div className="mb-4 rounded-card border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-500">
        <span className="font-mono text-xs">{cluster.id}</span> — all {cluster.memberCount}{" "}
        reports validated. They move to Recent validated on refresh.
      </div>
    );
  }

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
        {/* [Split into commitments] was removed here. Splitting a cluster means
            writing incident_reports.cluster_id, and it's unconfirmed whether
            that column is writable by a barangay role — plus the
            duplicate-flagging algorithm owns cluster assignment and would
            likely re-cluster anyway. It fired a toast claiming the split had
            happened. Re-add only once the backend confirms a supported path. */}
        <Button
          variant="primary"
          size="sm"
          disabled={isPending}
          onClick={() => setShowConfirm(true)}
        >
          Validate as one cluster
        </Button>
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
                {member.location && (
                  <>
                    <span>{member.location}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span>{member.timestamp}</span>
                <span aria-hidden>·</span>
                <ReporterChip reporter={member.reporter} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <ConfirmModal
          title={`Validate all ${cluster.memberCount} reports in ${cluster.id}?`}
          description="Each report is validated individually. Any that another official has already reviewed will be skipped and reported back."
          confirmLabel={`Validate ${cluster.memberCount} reports`}
          busy={isPending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleValidateCluster}
        />
      )}
    </div>
  );
}
