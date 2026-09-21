import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { ReporterInfo } from "@/types";

// The label is chosen here from identityWithheld, not read from reporter.name.
// The loaders only ever set that field to one of these two English phrases —
// no reporter name reaches this console — so translating by the flag shows
// the same fact in the chosen language. The CSV export keeps the English.
export function ReporterChip({ reporter }: { reporter: ReporterInfo }) {
  const t = useT();
  if (reporter.identityWithheld) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px]">
          ?
        </span>
        {t("reporter.withheld")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-700">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
        {initials(t("reporter.verified"))}
      </span>
      {t("reporter.verified")}
    </span>
  );
}
