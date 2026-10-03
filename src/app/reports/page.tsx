import { requireBarangayOfficial } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { getDailyQueueSummary } from "@/lib/data/dailyQueueSummary";
import { getMonthlyResolutionTimes } from "@/lib/data/resolutionTimes";
import { ReportsClient } from "./ReportsClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it.
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { date?: string | string[]; month?: string | string[] };
}) {
  const official = await requireBarangayOfficial();
  // The day arrives in the URL (?date=YYYY-MM-DD) so a summary can be
  // reloaded or shared as a link. The loader validates it.
  const requestedDate = typeof searchParams.date === "string" ? searchParams.date : undefined;
  // The monthly resolution-time report's month, likewise (?month=YYYY-MM).
  const requestedMonth = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const [summary, resolution] = await Promise.all([
    getDailyQueueSummary(official.barangayId, requestedDate),
    getMonthlyResolutionTimes(requestedMonth),
  ]);
  // The language provider wraps the page component itself, so the strings
  // it builds (breadcrumb, footers, empty states) follow the chosen language.
  return (
    <LanguageProvider role={official.role}>
      <ReportsClient official={official} summary={summary} resolution={resolution} />
    </LanguageProvider>
  );
}
