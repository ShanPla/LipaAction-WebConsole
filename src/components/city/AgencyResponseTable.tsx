"use client";

import { formatDuration } from "@/lib/utils";
import { useT } from "@/lib/i18n";
// Type-only import from a server-only module — erased at compile time.
import type { CityResponseData, DurationSummary } from "@/lib/data/cityResponseTimes";

/**
 * The paper's Per-Agency Response Time view (A.5.2), as a table: one row per
 * agency that was routed a report in the window. See getCityResponseTimes
 * for where each clock starts.
 */
export function AgencyResponseTable({ response }: { response: CityResponseData }) {
  const t = useT();
  const { agencies, windowDays, loadFailed } = response;

  return (
    <section aria-labelledby="city-response-title" className="mb-6">
      <div className="mb-3">
        <h2 id="city-response-title" className="text-sm font-semibold text-ink-900">
          {t("city.response.title")}
        </h2>
        <p className="text-xs text-ink-500">{t("city.response.intro", { days: windowDays })}</p>
      </div>

      {agencies.length === 0 ? (
        !loadFailed && (
          <div className="rounded-card border border-ink-100 bg-white px-4 py-10 text-center shadow-panel">
            <p className="text-sm text-ink-500">{t("city.response.empty", { days: windowDays })}</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white shadow-panel">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">{t("city.response.caption")}</caption>
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.response.col.agency")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("city.response.col.routed")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("city.response.col.awaiting")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("routing.progress.inProgress")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.response.col.toAck")}</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">{t("city.response.col.toResolve")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("city.response.col.resolved")}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold">{t("city.response.col.returned")}</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.agencyId} className="border-b border-ink-100 align-top last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-xs font-medium text-ink-900">
                    {a.name ?? t("city.unnamedAgency")}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-900">{a.routed}</td>
                  <td
                    className={
                      a.awaitingAcknowledgement > 0
                        ? "px-4 py-2.5 text-right font-semibold tabular-nums text-priority-critical"
                        : "px-4 py-2.5 text-right tabular-nums text-ink-700"
                    }
                  >
                    {a.awaitingAcknowledgement}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{a.inProgress}</td>
                  <td className="px-4 py-2.5">
                    <Duration summary={a.toAcknowledge} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Duration summary={a.toResolve} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{a.resolved}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-700">{a.returned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-500">
        {t("city.response.footer", { min: response.minSamplesForP95 })}
        {response.capped && ` ${t("city.capped", { limit: response.limit })}`}
      </p>
    </section>
  );
}

function Duration({ summary }: { summary: DurationSummary }) {
  const t = useT();
  if (summary.median === null) {
    return <span className="text-xs text-ink-500">{t("city.response.noTiming")}</span>;
  }
  return (
    <div className="leading-tight">
      <p className="tabular-nums text-ink-900">
        {t("city.response.median", { value: formatDuration(summary.median) })}
      </p>
      <p className="text-xs tabular-nums text-ink-500">
        {summary.p95 !== null && `${t("city.response.p95", { value: formatDuration(summary.p95) })} · `}
        {t("city.response.samples", { count: summary.samples })}
      </p>
    </div>
  );
}
