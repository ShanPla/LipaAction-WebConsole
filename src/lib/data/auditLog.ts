import "server-only";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/utils";
import type { AuditLogEntry, AuditSummary } from "@/types";

/**
 * The barangay's own slice of the access trail, through the backend's
 * `barangay_audit_log(p_report_id, p_limit)` — a SECURITY DEFINER function,
 * because the table itself is readable by nobody with a barangay role and a
 * row-level policy would expose every column on a readable row, including
 * the reporter link this console exists to keep hidden.
 *
 * Contract facts that shape the code below (frozen by the backend owner):
 * - The function owns its ordering (created_at desc, id desc). Never chain
 *   .order(): PostgREST stacks its own sort on top and a single-column
 *   re-sort drops the id tiebreak, because Postgres's sort isn't stable.
 * - Never .single(): an empty array is a normal answer, and .single() would
 *   turn it into an error again.
 * - p_limit clamps to 1..500 and the response can't say rows were dropped,
 *   so the page must say [newest N], never [the audit trail].
 * - There is no action filter. Filtering happens in the page, inside this
 *   window, and the page says so.
 * - Every refusal is 42501 with a stable token in error.details. Two of them
 *   (no_role, no_barangay) describe this account, not an outage, so they get
 *   their own state rather than the red banner.
 */
const AUDIT_LIMIT = 500;

interface RawAuditRow {
  id: string;
  action: string;
  actor_role: string | null;
  created_at: string;
  report_id: string | null;
}

/** Why the trail can't be shown, when that isn't an outage. */
export type AuditRefusal = "no_role" | "no_barangay";

export interface AuditLogData {
  entries: AuditLogEntry[];
  summary: AuditSummary;
  /** The window the function was asked for, so the page can say [newest N]. */
  limit: number;
  loadFailed: boolean;
  refusal: AuditRefusal | null;
}

export async function getBarangayAuditLog(): Promise<AuditLogData> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("barangay_audit_log", {
    p_report_id: null,
    p_limit: AUDIT_LIMIT,
  });

  if (error) {
    // details carries the token; the message is deliberately the same for
    // every refusal, so it can't be used to probe another barangay's ids.
    const token = typeof error.details === "string" ? error.details : "";
    console.error("[audit-log] load failed", error.code, token, error.message);
    if (error.code === "42501" && (token.includes("no_role") || token.includes("no_barangay"))) {
      return {
        ...emptyData(),
        refusal: token.includes("no_barangay") ? "no_barangay" : "no_role",
      };
    }
    return { ...emptyData(), loadFailed: true };
  }

  const rows = (data ?? []) as RawAuditRow[];
  const categories = await loadCategories(supabase, rows);

  const entries: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    // Free text by contract, not an enum: an action this console doesn't
    // know about renders as itself rather than vanishing.
    action: row.action,
    // Same rule for the role. Four are possible today, and a fifth must not
    // break the page.
    actorRole: row.actor_role ?? "",
    timestamp: formatEventTime(row.created_at),
    reportId: row.report_id,
    // Not on the audit row: read from the reports themselves, the same way
    // Validation History resolves reviewer names. Null when the report is
    // gone — deleting a report nulls report_id on the rows pointing at it.
    category: row.report_id ? categories.get(row.report_id) ?? null : null,
  }));

  return {
    entries,
    summary: summarise(entries),
    limit: AUDIT_LIMIT,
    loadFailed: false,
    refusal: null,
  };
}

/**
 * Categories for the reports these events touch. A second query, because the
 * function deliberately returns no report columns: an event row carrying a
 * report's category would imply a point-in-time truth about a value that is
 * actually current state.
 */
async function loadCategories(
  supabase: ReturnType<typeof createClient>,
  rows: RawAuditRow[]
): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((r) => r.report_id).filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("incident_reports").select("id, category").in("id", ids);
  if (error) {
    // The trail is still worth showing; the rows just carry their report id
    // without a category.
    console.error("[audit-log] category lookup failed", error.code, error.message);
    return new Map();
  }
  return new Map(
    (data as { id: string; category: string }[]).map((r) => [r.id, categoryLabel(r.category)])
  );
}

function summarise(entries: AuditLogEntry[]): AuditSummary {
  return {
    totalEvents: entries.length,
    decisions: entries.filter((e) => e.action === "report_validated" || e.action === "report_rejected")
      .length,
    routings: entries.filter((e) => e.action === "report_routed_manual").length,
    openings: entries.filter((e) => e.action === "report_viewed").length,
  };
}

function emptyData(): AuditLogData {
  return {
    entries: [],
    summary: { totalEvents: 0, decisions: 0, routings: 0, openings: 0 },
    limit: AUDIT_LIMIT,
    loadFailed: false,
    refusal: null,
  };
}

/** Manila, like every other time on the console. */
function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
