import { cx } from "@/lib/utils";
import type { PriorityTier } from "@/types";

const priorityStyles: Record<PriorityTier, string> = {
  Critical: "bg-priority-criticalBg text-priority-critical",
  High: "bg-priority-highBg text-priority-high",
  Medium: "bg-priority-mediumBg text-priority-medium",
  Low: "bg-priority-lowBg text-priority-low",
};

export function PriorityBadge({ priority }: { priority: PriorityTier }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        priorityStyles[priority]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {priority}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-100 text-brand-700",
    success: "bg-brand-100 text-brand-700",
    warning: "bg-priority-highBg text-priority-high",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
