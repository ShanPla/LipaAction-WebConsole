import { AppShell } from "@/components/layout/AppShell";
import { AuditSummaryTiles } from "@/components/audit-log/AuditSummaryTiles";
import { AuditFilters } from "@/components/audit-log/AuditFilters";
import { AuditTable } from "@/components/audit-log/AuditTable";
import { auditLogEntries, auditSummary } from "@/data/mockAuditLog";
import type { OfficialProfile } from "@/lib/auth";

export function AuditLogClient({ official }: { official: OfficialProfile }) {
  return (
    <AppShell breadcrumb={[official.barangayName, "Audit Log"]} official={official}>
      {/* Every number and row below is fixture data. Barangay roles have no
          read path to audit_logs, and which columns the desk may see at all
          is a data-protection decision still pending with the adviser — so
          this page is a layout preview, and must say so on screen rather
          than let sample rows pass for a live trail. The console DOES write
          to the trail (validate, reject, and opening a report's details);
          it just cannot read it back yet. */}
      <div
        role="note"
        className="mb-4 rounded-card border border-priority-medium/40 bg-priority-mediumBg px-4 py-3 text-xs text-ink-700"
      >
        <span className="font-semibold text-priority-medium">Sample data.</span> The audit
        trail is being recorded, but barangay accounts cannot read it back yet — what the
        barangay desk may see is a data-protection decision still pending. The rows below
        show the intended layout only. &middot; Sample lang ang datos na ito.
      </div>
      <AuditSummaryTiles summary={auditSummary} />
      <AuditFilters />
      <AuditTable entries={auditLogEntries} />
      <p className="mt-3 text-xs text-ink-500">
        Showing {auditLogEntries.length} sample events. Filters and counts above are not live.
      </p>
    </AppShell>
  );
}
