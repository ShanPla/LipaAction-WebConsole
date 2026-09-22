"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ReporterChip } from "@/components/ui/ReporterChip";
import { PriorityBadge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { validateReports } from "@/app/actions/reports";
import { callAction } from "@/lib/callAction";
import { useLang, useT } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import type { SituationCluster } from "@/types";

export function ClusterCard({
  cluster,
  // QueueClient's clock, so member ages keep moving while nothing refreshes;
  // null on the first render, which shows the server's own strings.
  now = null,
}: {
  cluster: SituationCluster;
  now?: number | null;
}) {
  const { showToast } = useToast();
  const t = useT();
  const lang = useLang();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [resolved, setResolved] = useState(false);

  function handleValidateCluster() {
    startTransition(async () => {
      const result = await callAction(() => validateReports(cluster.members.map((m) => m.id)));
      setShowConfirm(false);
      if (result === null) {
        showToast(t("common.noAnswer"), "danger");
        return;
      }
      const { validated, failures } = result;

      // Partial success is the normal case here, not an edge case: another
      // official can review one member between page load and this click. Say
      // exactly what happened rather than rounding it to success.
      // `validated > 0` guards the success branch: a zero-length member list
      // would otherwise report [Validated all 0 reports] as a success and mark
      // the cluster resolved. Not reachable today — a cluster needs 2+ members
      // to render — but a success toast for work that did not happen is the
      // exact failure this button was fixed to stop making.
      if (failures.length === 0 && validated > 0) {
        setResolved(true);
        showToast(t("cluster.toast.all", { count: validated, id: cluster.id }), "success");
      } else if (validated > 0) {
        showToast(
          t("cluster.toast.partial", {
            validated,
            total: cluster.members.length,
            failed: failures.length,
          }),
          "info"
        );
      } else {
        // The server's own reason when it gave one, which stays English like
        // every message a server action returns.
        showToast(failures[0]?.message ?? t("cluster.toast.failed"), "danger");
      }
    });
  }

  if (resolved) {
    return (
      <div className="mb-4 rounded-card border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm text-ink-500">
        <span className="font-mono text-xs">{cluster.id}</span>{" "}
        {t("cluster.card.done", { count: cluster.memberCount })}
      </div>
    );
  }

  // RLS shows this official only their own barangay's reports, so a cluster
  // reaches this card with one barangay; it read [2 reports across 1
  // barangays].
  const summary =
    cluster.barangaysAffected.length === 1
      ? t("cluster.card.inBarangay", { count: cluster.memberCount, barangay: cluster.barangaysAffected[0] })
      : t("cluster.card.acrossBarangays", {
          count: cluster.memberCount,
          barangays: cluster.barangaysAffected.length,
        });

  return (
    <div className="mb-4 overflow-hidden rounded-card border border-priority-critical/30 bg-priority-criticalBg/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-priority-critical/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-priority-critical px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {cluster.label}
          </span>
          <span className="text-sm font-medium text-ink-900">{summary}</span>
          {cluster.identityWithheldMembers > 0 && (
            <span className="text-xs text-ink-500">
              {t("cluster.card.withheld", { count: cluster.identityWithheldMembers })}
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
          {t("cluster.card.validate")}
        </Button>
      </div>

      {/* The English screen keeps a Tagalog hint, as elsewhere. It used to
          read [pag-verify, pag-recall, at pag-merge], naming recall and merge
          actions this card doesn't have; validating is the only one. */}
      {lang === "en" && <p className="px-4 pt-2 text-xs text-ink-500">Mga aksyon &middot; pag-verify</p>}

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
                <span>{now === null ? member.timestamp : timeAgo(member.details.submittedAt, now)}</span>
                <span aria-hidden>·</span>
                <ReporterChip reporter={member.reporter} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showConfirm && (
        <ConfirmModal
          title={t("cluster.confirm.title", { count: cluster.memberCount, id: cluster.id })}
          description={t("cluster.confirm.body")}
          confirmLabel={t("cluster.confirm.label", { count: cluster.memberCount })}
          busy={isPending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleValidateCluster}
        />
      )}
    </div>
  );
}
