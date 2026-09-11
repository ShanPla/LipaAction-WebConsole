import type { AgencyRouting, QueueReport, RoutingPlanEntry } from "@/types";

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
  | { kind: "downstream"; routing: AgencyRouting[]; summary: string };

export function routingState(report: QueueReport): RoutingState {
  const { status, routing, routingPlan } = report.details;

  if (status === "validated") {
    if (routing.length > 0) return { kind: "incomplete", routing, plan: routingPlan };
    if (routingPlan === null) return { kind: "unavailable" };
    if (routingPlan.length === 0) return { kind: "no-mapping" };
    return { kind: "ready", plan: routingPlan };
  }

  if (status === "routed" || status === "resolved") {
    return { kind: "downstream", routing, summary: downstreamSummary(status, routing) };
  }

  return { kind: "none" };
}

// resolution_outcome is a closed list on the backend. [resolved] needs no
// qualifier; the other three are closures without a fix, and say so.
const OUTCOME_LABELS: Record<NonNullable<AgencyRouting["resolutionOutcome"]>, string> = {
  resolved: "resolved",
  "confirmed-false": "confirmed false",
  duplicate: "duplicate",
  "out-of-scope": "out of scope",
};

/**
 * One agency's progress. There is no status column on agency_routing; the
 * stage is whichever timestamp the agency has set last.
 */
export function agencyProgressLabel(row: AgencyRouting): string {
  if (row.resolvedAt) {
    return row.resolutionOutcome && row.resolutionOutcome !== "resolved"
      ? `Closed — ${OUTCOME_LABELS[row.resolutionOutcome]}`
      : "Resolved";
  }
  if (row.acknowledgedAt) return "Acknowledged";
  return "Awaiting acknowledgement";
}

/**
 * The one-line version for a queue row. Leads with the primary agency (the
 * loader sorts it first) and counts the rest, because a row has room for one
 * name and the drawer lists them all.
 */
function downstreamSummary(status: string, routing: AgencyRouting[]): string {
  if (routing.length === 0) {
    // Routed by a path whose rows this desk can't see, or the routing load
    // failed. The status is still true; the detail just isn't available.
    return status === "resolved" ? "Resolved" : "Routed to agency";
  }

  const lead = routing[0];
  const more = routing.length > 1 ? ` +${routing.length - 1}` : "";

  if (routing.every((r) => r.resolvedAt)) {
    return lead.resolutionOutcome && lead.resolutionOutcome !== "resolved"
      ? `Closed by ${lead.agencyName}${more} — ${OUTCOME_LABELS[lead.resolutionOutcome]}`
      : `Resolved by ${lead.agencyName}${more}`;
  }

  const acknowledging = routing.find((r) => r.acknowledgedAt);
  if (acknowledging) return `Acknowledged by ${acknowledging.agencyName}${more}`;

  return `Routed to ${lead.agencyName}${more} · awaiting acknowledgement`;
}

/**
 * Copy for the routing confirmation. States the one thing an official most
 * needs before clicking: it can't be taken back from here — the desk has no
 * DELETE on agency_routing, and the status only moves forward.
 */
export function routeConfirmCopy(
  report: QueueReport,
  plan: RoutingPlanEntry[] | null,
  resuming: boolean
): { title: string; description: string; confirmLabel: string } {
  const names = plan && plan.length > 0 ? describePlan(plan) : null;
  const count = plan?.length ?? 0;
  const agencies = count === 1 ? "1 agency" : `${count} agencies`;

  if (resuming) {
    return {
      title: `Finish routing ${report.id}?`,
      description:
        "A previous attempt sent this report to some agencies but didn't complete. " +
        "Finishing sends it to any agencies still missing and records the routing. " +
        "Agencies that already have it won't receive it twice.",
      confirmLabel: "Finish routing",
    };
  }

  return {
    title: `Route ${report.id} to ${agencies}?`,
    description:
      `${names ?? "The mapped agencies"} will see it on their dashboards immediately. ` +
      "Routing can't be undone from this console.",
    confirmLabel: `Route to ${agencies}`,
  };
}

function describePlan(plan: RoutingPlanEntry[]): string {
  return plan.map((p) => (p.isPrimary ? `${p.agencyName} (lead)` : p.agencyName)).join(", ");
}
