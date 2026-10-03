"use client";

import { useT, type MessageKey } from "@/lib/i18n";

// The rest of the thesis's barangay report catalogue (Table p.146, A.3.8),
// each with the reason it isn't generated here. Listed, never faked: a report
// that needs data this console can't read stays a catalogue entry.
const ENTRIES: { number: number; cadence: MessageKey; title: MessageKey; status: MessageKey }[] = [
  { number: 13, cadence: "reports.cadence.weekly", title: "reports.catalogue.13.title", status: "reports.catalogue.13.status" },
  { number: 14, cadence: "reports.cadence.weekly", title: "reports.weeklyTitle", status: "reports.weeklyUnavailable" },
  { number: 15, cadence: "reports.cadence.weekly", title: "reports.catalogue.15.title", status: "reports.catalogue.15.status" },
  { number: 17, cadence: "reports.cadence.monthly", title: "reports.catalogue.17.title", status: "reports.catalogue.17.status" },
  { number: 18, cadence: "reports.cadence.monthly", title: "reports.catalogue.18.title", status: "reports.catalogue.18.status" },
];

export function ReportCatalogue() {
  const t = useT();
  return (
    <section
      aria-labelledby="report-catalogue-title"
      className="rounded-card border border-dashed border-ink-300 bg-white px-4 py-3 print:hidden"
    >
      <h2 id="report-catalogue-title" className="text-sm font-semibold text-ink-700">
        {t("reports.catalogue.title")}
      </h2>
      <p className="mt-1 text-xs text-ink-500">{t("reports.catalogue.intro")}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {ENTRIES.map((e) => (
          <li key={e.number}>
            <p className="text-xs font-semibold text-ink-900">
              #{e.number} · {t(e.title)} <span className="font-normal text-ink-500">· {t(e.cadence)}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{t(e.status)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
