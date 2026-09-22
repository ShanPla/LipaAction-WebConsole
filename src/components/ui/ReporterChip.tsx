import { useT } from "@/lib/i18n";
import { Icon } from "./Icon";
import type { ReporterInfo } from "@/types";

// The label is chosen here from identityWithheld, not read from reporter.name.
// The loaders only ever set that field to one of two English phrases (see
// reporterLabel) — no reporter name reaches this console — so translating by
// the flag shows the same fact in the chosen language. The CSV export keeps
// the English.
//
// Icons, not initials: the avatar used to print [VR] from [Verified
// reporter], which reads as a real person's initials.
export function ReporterChip({ reporter }: { reporter: ReporterInfo }) {
  const t = useT();
  if (reporter.identityWithheld) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100">
          <Icon name="lock" className="h-3 w-3" />
        </span>
        {t("reporter.withheld")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-700">
      <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
        <Icon name="check" className="h-3 w-3" />
      </span>
      {t("reporter.verified")}
    </span>
  );
}
