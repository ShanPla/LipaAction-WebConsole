// Shared by the city access log's server loader and its page. Plain values
// only, so the client component may import them; the loader itself is
// server-only and can't be imported from the browser.

/**
 * What the city access log writes to the trail each time it is opened,
 * through the backend's log_audit. The action name is the backend owner's to
 * choose (asked 2026-10-03); a name log_audit refuses makes the page show
 * nothing, never an unrecorded log.
 */
export const ACCESS_LOG_OPENED = "audit_log_viewed";

/** The kinds of event the page can be narrowed to, in chip order. */
export const ACCESS_LOG_KINDS = ["all", "openings", "decisions", "routing", "other"] as const;

export type AccessLogKind = (typeof ACCESS_LOG_KINDS)[number];

/**
 * The actions behind each named kind. [all] has no list, and [other] is
 * everything these three don't name, so an action the console has never seen
 * still appears under one of the chips.
 */
export const KIND_ACTIONS: Record<"openings" | "decisions" | "routing", readonly string[]> = {
  openings: ["report_viewed"],
  decisions: ["report_validated", "report_rejected"],
  routing: [
    "report_routed_manual",
    "report_auto_routed",
    "routing_in_progress",
    "report_resolved_by_agencies",
    "report_returned_to_barangay",
  ],
};

/**
 * Actions that are always about a report. One of these with no report id
 * means the report was deleted, which nulls the id on its audit rows; any
 * other action without one was never about a report.
 */
export const REPORT_ACTIONS: readonly string[] = [
  ...KIND_ACTIONS.openings,
  ...KIND_ACTIONS.decisions,
  ...KIND_ACTIONS.routing,
  "report_status_changed",
];

export function isAccessLogKind(value: unknown): value is AccessLogKind {
  return typeof value === "string" && (ACCESS_LOG_KINDS as readonly string[]).includes(value);
}
