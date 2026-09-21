// Shared domain types for the Barangay Web Console mockup.
// All data consumed by these types is static/dummy — see src/data/*.

import type { RejectReasonCode } from "@/lib/utils";

export type PriorityTier = "Critical" | "High" | "Medium" | "Low";

// null = not scored yet. priority_name is written by the inference service,
// and until it runs a report has none. That is not the same as Low, and an
// emergency must never be shown as Low because nothing has ranked it.
export type ReportPriority = PriorityTier | null;

export type QueueTabId = "emergency" | "standard" | "duplicates" | "validated";

export interface KpiSummary {
  fastTriageCount: number;
  standardIntakeCount: number;
  medianMinutes: number;
  // null when the count couldn't be loaded — rendered as a dash, not as 0.
  validatedCount: number | null;
}

export interface ReporterInfo {
  name: string; // or "Identity withheld"
  identityWithheld: boolean;
  trustScore?: number;
}

/**
 * One agency_routing row as the barangay desk can see it (ar_select_barangay).
 * There is no status column on agency_routing: progress is read from which
 * timestamps are set. The desk cannot change any of these — agency roles do.
 */
export interface AgencyRouting {
  agencyName: string;
  isPrimary: boolean;
  routedAt: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionOutcome: "resolved" | "confirmed-false" | "duplicate" | "out-of-scope" | null;
}

/** An agency that routing this report would send it to (category_agency_routing). */
export interface RoutingPlanEntry {
  agencyName: string;
  isPrimary: boolean;
}

/**
 * The fuller picture of a report, shown in the detail drawer.
 *
 * Every field here is a real incident_reports column, except the two routing
 * fields, which come from agency_routing and category_agency_routing. The
 * free-text ones (severitySelfRating, anyoneHurt, safetyNetConfirmation) are
 * rendered verbatim rather than mapped to friendlier labels — their value
 * vocabulary is set by the mobile app, not by this console, so relabelling
 * them here would be guessing.
 */
export interface ReportDetails {
  entryTier: "emergency" | "other_reports";
  status: string;
  description: string | null;
  severitySelfRating: string | null;
  safetyNetConfirmation: string | null;
  anyoneHurt: string | null;
  isOngoing: boolean | null;
  hasPhoto: boolean;
  hasVideo: boolean;
  discreetReporting: boolean;
  priorityClass: number | null;
  priorityScore: number | null;
  confidenceBand: string | null;
  clusterId: string | null;
  submittedAt: string; // exact ISO timestamp, not the relative display string
  // Agencies this report has been sent to. Empty until it is routed — and
  // non-empty on a validated report only when a routing attempt stopped
  // part-way, which the UI offers to finish.
  routing: AgencyRouting[];
  // Where routing would send it, from category_agency_routing. Carried by
  // pending reports too, for the drawer's preview before a decision. [] when
  // the category has no mapping — shown as [needs barangay review], never
  // filled with a guess; null when the mapping couldn't be loaded, and on
  // routed or resolved reports, where it no longer applies.
  routingPlan: RoutingPlanEntry[] | null;
}

export interface QueueReport {
  id: string; // e.g. "24-2024-2312"
  category: string; // e.g. "Vehicular accident"
  priority: ReportPriority;
  summary: string;
  location?: string; // no address text in real data — only present for mock/demo data
  timestamp: string; // display string, e.g. "2m ago"
  reporter: ReporterInfo;
  isClusterMember?: boolean;
  details: ReportDetails;
}

export interface SituationCluster {
  id: string; // e.g. "CL-083"
  label: string; // e.g. "ACTIVE FLOODING"
  category: string;
  memberCount: number;
  barangaysAffected: string[];
  identityWithheldMembers: number;
  members: QueueReport[];
}

export interface ClusterMemberDetail {
  reportId: string;
  category: string;
  priority: ReportPriority;
  relationship: "Primary" | "Related";
  timestamp: string;
  reporter: ReporterInfo;
  visualHash?: number; // pairwise proximity signal
  temporalDeltaSeconds?: number;
  sitio?: string;
}

export interface ClusterExplorerEntry {
  id: string;
  category: string;
  memberCount: number;
  status: "Critical" | "High" | "Standard";
  radiusMeters?: number; // no real geospatial computation exists yet — mock/demo only
  centroidLabel: string;
  members: ClusterMemberDetail[];
}

export interface ValidationRecord {
  reportId: string;
  category: string;
  // The report's real priority_name. Previously a derived "tier"
  // (Critical/Standard/Log) that the table then re-mapped onto a priority
  // badge — which displayed a Low report as "High". Priority and intake tier
  // are separate axes and are now carried, and rendered, separately.
  priority: ReportPriority;
  entryTier: "emergency" | "other_reports";
  verdict: "Confirmed" | "Rejected";
  validatingOfficial: string;
  timestamp: string; // display string, e.g. "Sep 05, 21:47"
  // Raw ISO of the same moment. `timestamp` is preformatted for display and
  // can't be compared, so date-range filtering reads this instead.
  reviewedAt: string;
  reporter: ReporterInfo;
  trustDelta?: string; // no real trust-score column — mock/demo only
  // Real data from the review_report() cutover (incident_reports.review_reason).
  // Only present on rejected rows — the RPC only fills it on rejection.
  reason?: string;
  // The category prefix parsed out of `reason` (parseRejectReason) and the
  // note after it. reasonCode is null for a reason without a known prefix —
  // older rejections, or the other dashboard's — and reasonNote is then the
  // whole text, shown as it stands.
  reasonCode?: RejectReasonCode | null;
  reasonNote?: string;
}

export interface ValidationSummary {
  total: number;
  confirmed: number;
  rejected: number;
  identityWithheld: number;
}

export type AuditActionType =
  | "Validate"
  | "Reassign"
  | "Cluster action"
  | "Export"
  | "Login"
  | "Dispatch"
  | "Recall";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: "Brgy. Secretary" | "Brgy. Captain" | "System" | "Cluster admin";
  actionType: AuditActionType;
  affectedEntity: string;
  beforeAfterDiff: string; // monospace before -> after summary
  isPiiAccess?: boolean;
}

export interface AuditSummary {
  totalEvents: number;
  stateChangingActions: number;
  piiAccessEvents: number;
  uniqueActors: number;
}

export type SettingsSectionId =
  | "profile"
  | "language"
  | "notifications"
  | "privacy"
  | "about";