export function Tile({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string | number;
  accent?: "default" | "brand" | "critical";
}) {
  const accentText =
    accent === "brand"
      ? "text-brand-600"
      : accent === "critical"
      ? "text-priority-critical"
      : "text-ink-900";

  return (
    <div className="flex min-w-[120px] flex-col gap-0.5 rounded-card border border-ink-100 bg-white px-4 py-2.5 shadow-panel">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
        {label}
      </span>
      <span className={`text-xl font-semibold ${accentText}`}>{value}</span>
    </div>
  );
}
