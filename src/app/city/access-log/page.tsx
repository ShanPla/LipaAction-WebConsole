import { requireCityAdmin } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { openCityAccessLog } from "@/lib/data/cityAccessLog";
import { AccessLogClient } from "./AccessLogClient";

// This page depends on the signed-in user's session and live data — never
// statically prerender it. It also writes an access record on every render,
// which a prerender would turn into one record for nobody.
export const dynamic = "force-dynamic";

export default async function CityAccessLogPage({
  searchParams,
}: {
  searchParams: { kind?: string | string[]; from?: string | string[]; to?: string | string[] };
}) {
  const admin = await requireCityAdmin();
  // The filters arrive in the URL; the loader proves each before use.
  const kind = typeof searchParams.kind === "string" ? searchParams.kind : undefined;
  const data = await openCityAccessLog(kind, searchParams.from, searchParams.to);
  return (
    <LanguageProvider role={admin.role}>
      <AccessLogClient admin={admin} data={data} />
    </LanguageProvider>
  );
}
