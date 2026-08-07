import { initials } from "@/lib/utils";
import type { ReporterInfo } from "@/types";

export function ReporterChip({ reporter }: { reporter: ReporterInfo }) {
  if (reporter.identityWithheld) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px]">
          ?
        </span>
        Identity withheld
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-700">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
        {initials(reporter.name)}
      </span>
      {reporter.name}
    </span>
  );
}
