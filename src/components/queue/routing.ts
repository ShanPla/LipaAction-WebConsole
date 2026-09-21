import type { AgencyRouting, QueueReport, RoutingPlanEntry } from "@/types";
// Type-only: the helpers below take a Translate function rather than calling
// a hook, so they stay plain functions the row and the drawer can share.
import type { Translate } from "@/lib/i18n";

/**
 * Where a report stands with respect to agencies — one reading shared by the
 * queue row and the detail drawer, so the two can never disagree about
 * whether a report still needs routing.
 */
export type RoutingState =
  // Pending or rejected: routing doesn't apply.
  | { kind: "none" }
  // Validated, mapping known, not yet sent anywhere.
  | { kind: "ready"; plan: RoutingPlanEntry[] }
  // Validated but some agencies already hold it: a previous attempt stopped
  // part-way. routeReport is idempotent, so the same action finishes it.
  | { kind: "incomplete"; routing: AgencyRouting[]; plan: RoutingPlanEntry[] | null }
  // Validated, and the category maps to no agency (e.g. other_emergency).
  | { kind: "no-mapping" }
  // Validated, but the mapping couldn't be loaded. Not the same claim as
  // no-mapping, and must not be shown as one.
  | { kind: "unavailable" }
  // Routed or resolved: agencies own it now; the desk watches.
  | { kind: "downstream"; status: "routed" | "resolved"; routing: AgencyRouting[] };

export function routingState(report: QueueReport): RoutingState {
  const { status, routing, routingPlan } = report.details;

  if (status === "validated") {
    if (routing.length > 0) return { kind: "incomplete", routing, plan: routingPlan };
    if (routingPlan === null) return { kind: "unavailable" };
    if (routingPlan.length === 0) return { kind: "no-mapping" };
    return { kind: "ready", plan: routingPlan };
  }

  if (status === "routed" || status === "resolved") {
    return { kind: "downstream", status, routing };
  }

  return { kind: "none" };
}

// resolution_outcome is a closed list on the backend, one message key per
// value (routing.outcome.*). [resolved] needs no qualifier; the other three
// are closures without a fix, and say so.
function outcomeLabel(outcome: NonNullable<AgencyRouting["resolutionOutcome"]>, t: Translate): string {
  return t(`routing.outcome.${outcome}`);
}

/**
 * One agency's progress. There is no status column on agency_routing; the
 * stage is whichever timestamp the agency has set last.
 */
export function agencyProgressLabel(row: AgencyRouting, t: Translate): string {
  if (row.resolvedAt) {
    return row.resolutionOutcome && row.resolutionOutcome !== "resolved"
      ? t("routing.progress.closed", { outcome: outcomeLabel(row.resolutionOutcome, t) })
      : t("status.resolved");
  }
  if (row.acknowledgedAt) return t("routing.progress.acknowledged");
  return t("routing.progress.awaiting");
}

/**
 * The one-line version for a queue row. Leads with the primary agency (the
 * loader sorts it first) and counts the rest, because a row has room for one
 * name and the drawer lists them all.
 */
export function downstreamSummary(
  state: Extract<RoutingState, { kind: "downstream" }>,
  t: Translate
): string {
  const { status, routing } = state;
  if (routing.length === 0) {
    // Routed by a path whose rows this desk can't see, or the routing load
    // failed. The status is still true; the detail just isn't available.
    return t(status === "resolved" ? "status.resolved" : "status.routed");
  }

  const lead = routing[0];
  const more = routing.length > 1 ? ` +${routing.length - 1}` : "";

  if (routing.every((r) => r.resolvedAt)) {
    return lead.resolutionOutcome && lead.resolutionOutcome !== "resolved"
      ? t("routing.summary.closedBy", {
          agency: lead.agencyName,
          more,
          outcome: outcomeLabel(lead.resolutionOutcome, t),
        })
      : t("routing.summary.resolvedBy", { agency: lead.agencyName, more });
  }

  const acknowledging = routing.find((r) => r.acknowledgedAt);
  if (acknowledging) {
    return t("routing.summary.acknowledgedBy", { agency: acknowledging.agencyName, more });
  }

  return t("routing.summary.routedTo", { agency: lead.agencyName, more });
}

/**
 * Copy for the routing confirmation. States the one thing an official most
 * needs before clicking: it can't be taken back from here — the desk has no
 * DELETE on agency_routing, and the status only moves forward.
 */
export function routeConfirmCopy(
  report: QueueReport,
  plan: RoutingPlanEntry[] | null,
  resuming: boolean,
  t: Translate
): { title: string; description: string; confirmLabel: string } {
  const names = plan && plan.length > 0 ? describePlan(plan, t) : null;
  const count = plan?.length ?? 0;
  const agencies = agencyCount(count, t);

  if (resuming) {
    return {
      title: t("routing.finishTitle", { id: report.id }),
      description: t("routing.finishDescription"),
      confirmLabel: t("routing.finish"),
    };
  }

  return {
    title: t("routing.routeTitle", { id: report.id, agencies }),
    description: t("routing.routeDescription", { names: names ?? t("routing.mappedAgencies") }),
    confirmLabel: t("routing.routeConfirm", { agencies }),
  };
}

/** [1 agency] / [3 agencies] — shared with the routed toast. */
export function agencyCount(count: number, t: Translate): string {
  return count === 1 ? t("routing.agencyCountOne") : t("routing.agencyCount", { count });
}

function describePlan(plan: RoutingPlanEntry[], t: Translate): string {
  return plan
    .map((p) => (p.isPrimary ? `${p.agencyName} ${t("routing.lead")}` : p.agencyName))
    .join(", ");
}
