"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Tile } from "@/components/ui/Tile";
import { cx } from "@/lib/utils";
import { useT, type MessageKey, type Translate } from "@/lib/i18n";
import { ACCESS_LOG_KINDS, ACCESS_LOG_OPENED, REPORT_ACTIONS, type AccessLogKind } from "@/lib/accessLog";
// Type-only imports from a server-only module — erased at compile time.
import type { AccessLogData, AccessLogEntry } from "@/lib/data/cityAccessLog";

const KIND_LABELS: Record<AccessLogKind, MessageKey> = {
  all: "audit.filter.all",
  openings: "audit.filter.openings",
  decisions: "audit.filter.decisions",
  routing: "city.access.kind.routing",
  other: "city.access.kind.other",
};

// The actions this console knows. Any other renders as its raw text rather
// than disappearing: action is free text, and a new backend event must still
// be readable here.
const ACTION_LABELS: Record<string, MessageKey> = {
  report_viewed: "audit.action.report_viewed",
  report_validated: "audit.action.report_validated",
  report_rejected: "audit.action.report_rejected",
  report_routed_manual: "audit.action.report_routed_manual",
  report_auto_routed: "audit.action.report_auto_routed",
  routing_in_progress: "audit.action.routing_in_progress",
  report_resolved_by_agencies: "audit.action.report_resolved_by_agencies",
  report_returned_to_barangay: "audit.action.report_returned_to_barangay",
  report_status_changed: "audit.action.report_status_changed",
  identity_reveal: "audit.action.identity_reveal",
  [ACCESS_LOG_OPENED]: "city.access.action.opened",
};

const ACTION_TONES: Record<string, "neutral" | "brand" | "warning"> = {
  report_validated: "brand",
  report_rejected: "warning",
  report_routed_manual: "brand",
  report_auto_routed: "brand",
  report_resolved_by_agencies: "brand",
  report_returned_to_barangay: "warning",
  identity_reveal: "warning",
};

// Known roles get a label; an unknown one shows as itself, a missing one as
// a dash.
const ROLE_LABELS: Record<string, MessageKey> = {
  barangay_official: "role.barangay_official",
  barangay_admin: "role.barangay_admin",
  senior_barangay_admin: "role.senior_barangay_admin",
  municipal_admin: "role.municipal_admin",
  agency_user: "role.agency_user",
  agency_supervisor: "role.agency_supervisor",
  dpo: "role.dpo",
  resident: "role.resident",
};

/**
 * The city access log: each recorded event with the official behind it.
 * The kind filter lives in the URL, so the server does the narrowing over the
 * whole trail, not over a window already loaded, and each view is recorded.
 */
export function AccessLogView({ data }: { data: AccessLogData }) {
  const t = useT();
  const router = useRouter();

  function choose(kind: AccessLogKind) {
    router.push(kind === "all" ? "/city/access-log" : `/city/access-log?kind=${kind}`);
  }

  return (
    <section aria-labelledby="city-access-title" className="mb-6">
      <div className="mb-3">
        <h2 id="city-access-title" className="text-sm font-semibold text-ink-900">
          {t("city.access.title")}
        </h2>
        <p className="text-xs text-ink-500">{t("city.access.intro")}</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <Tile label={t("audit.tile.total")} value={data.summary.events} />
        <Tile label={t("audit.tile.openings")} value={data.summary.openings} />
        <Tile label={t("audit.tile.decisions")} value={data.summary.decisions} accent="brand" />
        <Tile label={t("city.access.tile.officials")} value={data.summary.officials} />
      </div>

      <div role="group" aria-label={t("city.access.filter")} className="mb-4 flex flex-wrap gap-2">
        {ACCESS_LOG_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={data.kind === kind}
            onClick={() => choose(kind)}
            className={cx(
              "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
              data.kind === kind
                ? "border-brand-500 bg-brand-100 text-brand-700"
                : "border-ink-100 bg-white text-ink-700 hover:bg-ink-100"
            )}
          >
            {t(KIND_LABELS[kind])}
          </button>
        ))}
      </div>

      {data.entries.length === 0 ? (
        !data.loadFailed && (
          <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
            <p className="text-sm text-ink-500">
              {t(data.kind === "all" ? "city.access.empty" : "city.access.emptyFiltered")}
            </p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white shadow-panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">{t("city.access.caption")}</caption>
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("field.timestamp")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.access.col.who")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.role")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.action")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("audit.col.report")}</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => {
                const actionKey = ACTION_LABELS[entry.action];
                const roleKey = entry.actorRole ? ROLE_LABELS[entry.actorRole] : undefined;
                return (
                  <tr key={entry.id} className="border-b border-ink-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink-500">{entry.timestamp}</td>
                    <td className="px-4 py-2.5">{actorCell(entry, data.namesUnavailable, t)}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-700">
                      {roleKey ? t(roleKey) : entry.actorRole || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={ACTION_TONES[entry.action] ?? "neutral"}>
                        {actionKey ? t(actionKey) : entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">{reportCell(entry, t)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-500">
        {t("city.access.footer", { count: data.entries.length })}
        {data.capped && ` ${t("city.access.capped", { limit: data.limit })}`}
      </p>
    </section>
  );
}

// Who did it. Only officials are named; a resident is shown by role alone,
// and an event the database wrote by itself says so.
function actorCell(entry: AccessLogEntry, namesUnavailable: boolean, t: Translate) {
  const { actor } = entry;
  if (actor.kind !== "official") {
    const key: MessageKey =
      actor.kind === "resident" ? "city.access.resident" : actor.kind === "system" ? "city.access.system" : "city.access.notNamed";
    return <span className="text-xs italic text-ink-500">{t(key)}</span>;
  }
  const name = actor.name ?? t(namesUnavailable ? "city.access.nameUnavailable" : "city.access.unnamed");
  const office = actor.office === null ? null : actor.office.type === "city" ? t("city.scope") : actor.office.name;
  return (
    <div className="leading-tight">
      <p className="text-xs font-medium text-ink-900">{name}</p>
      {office && <p className="text-[11px] text-ink-500">{office}</p>}
    </div>
  );
}

function reportCell(entry: AccessLogEntry, t: Translate) {
  if (!entry.reportId) {
    // A report event without a report: the report was deleted, which blanks
    // the id on its audit rows. Anything else was never about a report.
    return REPORT_ACTIONS.includes(entry.action) ? (
      <span className="text-[11px] text-ink-500">{t("audit.reportGone")}</span>
    ) : (
      <span className="text-xs text-ink-500">—</span>
    );
  }
  return (
    <div className="leading-tight">
      <p className="font-mono text-xs text-ink-700">{entry.reportId}</p>
      {entry.category && <p className="text-[11px] text-ink-500">{entry.category}</p>}
    </div>
  );
}
