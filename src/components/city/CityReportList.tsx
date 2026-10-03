"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { statusLabel } from "@/components/queue/useReportReview";
import { splitRouting, agencyProgressLabel } from "@/components/queue/routing";
import { cx } from "@/lib/utils";
import { useT, type MessageKey, type Translate } from "@/lib/i18n";
import { CityReportDrawer, barangayOf, formatTimestamp } from "./CityReportDrawer";
// Type-only imports from a server-only module — erased at compile time.
import type { CityReport, CityReportsData, CityStatusFilter } from "@/lib/data/cityReports";

// The loader's filter keys, listed here because a client component can't
// import a value from a server-only module. The type keeps the two in step.
const STAGES: { value: CityStatusFilter; label: MessageKey }[] = [
  { value: "all", label: "city.stage.all" },
  { value: "awaiting", label: "city.stage.awaiting" },
  { value: "validated", label: "city.stage.validated" },
  { value: "withAgencies", label: "city.stage.withAgencies" },
  { value: "rejected", label: "city.stage.rejected" },
];

/**
 * Every report filed in the city over the window, newest first, filterable
 * by barangay and stage. The filters live in the URL, so the server does the
 * narrowing and a filtered view can be reloaded.
 *
 * The list shows no description: the resident's own words appear only in
 * the drawer, whose opening is recorded in the access log.
 */
export function CityReportList({ data }: { data: CityReportsData }) {
  const t = useT();
  const router = useRouter();
  // A report named in the URL (from the city map) opens on arrival, if it is
  // in this list. Its drawer records the opening like any other.
  const [openId, setOpenId] = useState<string | null>(() =>
    data.open && data.reports.some((r) => r.id === data.open) ? data.open : null
  );
  const open = data.reports.find((r) => r.id === openId) ?? null;
  const openMissing = data.open !== null && !data.loadFailed && !data.reports.some((r) => r.id === data.open);

  function closeDrawer() {
    setOpenId(null);
    // Off the URL once closed, so a reload doesn't open it again unasked.
    if (data.open) navigate({});
  }

  function navigate(next: { barangay?: string | null; status?: CityStatusFilter }) {
    const barangay = next.barangay !== undefined ? next.barangay : data.barangay;
    const status = next.status ?? data.status;
    const params = new URLSearchParams();
    if (barangay) params.set("barangay", barangay);
    if (status !== "all") params.set("status", status);
    const query = params.toString();
    router.push(query ? `/city/reports?${query}` : "/city/reports");
  }

  const filtered = data.barangay !== null || data.status !== "all";

  return (
    <section aria-labelledby="city-reports-title" className="mb-6">
      <div className="mb-3">
        <h2 id="city-reports-title" className="text-sm font-semibold text-ink-900">
          {t("city.reports.title")}
        </h2>
        <p className="text-xs text-ink-500">{t("city.reports.intro", { days: data.windowDays })}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          {t("city.col.barangay")}
          <select
            value={data.barangay ?? ""}
            onChange={(e) => navigate({ barangay: e.target.value || null })}
            className="min-h-11 rounded-md border border-ink-100 bg-white px-4 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("city.filter.allBarangays")}</option>
            {data.barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label={t("city.filter.stage")} className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={data.status === s.value}
              onClick={() => navigate({ status: s.value })}
              className={cx(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                data.status === s.value
                  ? "border-brand-500 bg-brand-100 text-brand-700"
                  : "border-ink-100 bg-white text-ink-700 hover:bg-ink-100"
              )}
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>

      {openMissing && (
        <p role="note" className="mb-3 text-xs text-ink-700">
          {t("city.reports.openMissing", { days: data.windowDays, limit: data.limit })}
        </p>
      )}

      {data.reports.length === 0 ? (
        !data.loadFailed && (
          <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
            <p className="text-sm text-ink-500">
              {t(filtered ? "city.reports.emptyFiltered" : "city.reports.empty", { days: data.windowDays })}
            </p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white shadow-panel">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">{t("city.reports.caption")}</caption>
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.reports.col.submitted")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.col.barangay")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("reports.col.category")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("drawer.priority")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("drawer.status")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.reports.col.agencies")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  <span className="sr-only">{t("city.reports.col.open")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((r) => (
                <tr key={r.id} className="border-b border-ink-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-700">{formatTimestamp(r.submittedAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-900">{barangayOf(r, t)}</td>
                  <th scope="row" className="px-4 py-2.5 text-xs font-medium text-ink-900">
                    {r.category}
                    {r.discreetReporting && (
                      <span
                        title={t("drawer.discreetBanner")}
                        className="ml-2 rounded-full bg-priority-mediumBg px-2 py-0.5 text-[11px] font-semibold text-priority-medium"
                      >
                        {t("row.discreet")}
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={r.priority} score={r.priorityScore} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-700">{statusLabel(r.status, t)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-700">{agencySummary(r, t)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setOpenId(r.id)}
                      aria-label={t("row.viewDetails", { id: r.id })}
                    >
                      {t("city.reports.open")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-500">
        {t("city.reports.footer", { count: data.reports.length })}
        {data.capped && ` ${t("city.reports.capped", { limit: data.limit })}`}
      </p>

      {open && <CityReportDrawer report={open} onClose={closeDrawer} />}
    </section>
  );
}

// [Bureau of Fire Protection +1 · Acknowledged], from the agencies holding
// the report now; ones that sent it back before a re-route aren't counted.
function agencySummary(r: CityReport, t: Translate): string {
  if (r.routing === null) return t("city.reports.agenciesUnavailable");
  if (r.routing.length === 0) return "—";
  const { current } = splitRouting(r.routing);
  const lead = current[0] ?? r.routing[0];
  const more = current.length > 1 ? ` +${current.length - 1}` : "";
  return `${lead.agencyName}${more} · ${agencyProgressLabel(lead, t)}`;
}
