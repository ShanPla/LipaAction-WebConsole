import { AppShell } from "@/components/layout/AppShell";
import { AuditSummaryTiles } from "@/components/audit-log/AuditSummaryTiles";
import { AuditFilters } from "@/components/audit-log/AuditFilters";
import { AuditTable } from "@/components/audit-log/AuditTable";
import { auditLogEntries, auditSummary } from "@/data/mockAuditLog";

export default function AuditLogPage() {
  return (
    <AppShell breadcrumb={["Brgy. Tambo", "Audit Log"]}>
      <AuditSummaryTiles summary={auditSummary} />
      <AuditFilters />
      <AuditTable entries={auditLogEntries} />
      <p className="mt-3 text-xs text-ink-500">
        Showing {auditLogEntries.length} of {auditSummary.totalEvents} events &middot;
        retention: 180 days (verification/sanction events retained indefinitely)
      </p>
    </AppShell>
  );
}
