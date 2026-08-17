// Shared domain types for the Barangay Web Console mockup.
// All data consumed by these types is static/dummy — see src/data/*.

export type PriorityTier = "Critical" | "High" | "Medium" | "Low";

export type QueueTabId =
  | "emergency"
  | "standard"
  | "recall"
  | "duplicates"
  | "validated";

export interface KpiSummary {
  fastTriageCount: number;
  standardIntakeCount: number;
  medianMinutes: number;
  validatedCount: number;
}

export interface ReporterInfo {
  name: string; // or "Identity withheld"
  identityWithheld: boolean;
  trustScore?: number;
}

export interface QueueReport {
  id: string; // e.g. "24-2024-2312"
  category: string; // e.g. "Vehicular accident"
  priority: PriorityTier;
  summary: string;
  location: string;
  timestamp: string; // display string, e.g. "2m ago"
  reporter: ReporterInfo;
  isClusterMember?: boolean;
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
  priority: PriorityTier;
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
  radiusMeters: number;
  centroidLabel: string;
  members: ClusterMemberDetail[];
}

export interface ValidationRecord {
  reportId: string;
  category: string;
  tier: "Critical" | "Standard" | "Log";
  verdict: "Confirmed" | "Rejected";
  validatingOfficial: string;
  timestamp: string;
  reporter: ReporterInfo;
  trustDelta?: string;
}

export interface ValidationSummary {
  total: number;
  confirmed: number;
  confirmedFalse: number;
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

// NOTE: this is the mock-data shape for the (not-yet-wired-to-real-data)
// Settings > Profile section. Deliberately named differently from
// lib/auth.ts's OfficialProfile (the REAL signed-in official from Supabase,
// used by AppShell/Sidebar/TopBar) — they used to share the name
// "OfficialProfile" which was a genuine mix-up risk once both existed.
export interface MockOfficialProfile {
  name: string;
  role: string;
  barangay: string;
  city: string;
  email: string;
  phone: string;
  mfaEnabled: boolean;
  roleGrantedBy: string;
  roleGrantedDate: string;
}

export interface NotificationPreferences {
  audibleAlertNewEmergency: boolean;
  slaBreachBrowserNotification: boolean;
}

export type SettingsSectionId =
  | "profile"
  | "language"
  | "notifications"
  | "privacy"
  | "about";
