// The Reports page keeps each report's choice in the URL (?date= for the
// daily summary, ?month= for the monthly resolution times), so a view can be
// reloaded or shared. Changing one must keep the other.
export function reportsHref(
  next: { date: string; month: string },
  defaults: { today: string; currentMonth: string }
): string {
  const params = new URLSearchParams();
  if (next.date !== defaults.today) params.set("date", next.date);
  if (next.month !== defaults.currentMonth) params.set("month", next.month);
  const query = params.toString();
  return query ? `/reports?${query}` : "/reports";
}

// [October 2026]. English, like every other date formatted from data.
export function formatMonth(month: string): string {
  return new Date(`${month}-15T12:00:00+08:00`).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    year: "numeric",
  });
}

// The months the picker offers: the current one and the eleven before it,
// newest first, plus the one shown if a link asked for an older month.
export function monthOptions(currentMonth: string, shown: string): string[] {
  const [y, m] = currentMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const total = y * 12 + (m - 1) - i;
    out.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
  }
  if (!out.includes(shown)) out.push(shown);
  return out;
}
