export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const ROLE_LABELS: Record<string, string> = {
  barangay_official: "Brgy. Official",
  barangay_admin: "Brgy. Admin",
  senior_barangay_admin: "Senior Brgy. Admin",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * An official's name as it should appear on screen.
 *
 * `fullName ?? "Unnamed official"` is not enough: `??` only catches null and
 * undefined, so an empty or whitespace-only profiles.full_name fell through
 * and rendered as a blank name with a blank avatar. This console can't write
 * such a value — updateDisplayName rejects it — but `profiles` is shared with
 * the mobile app and the other dashboard, and rows are also inserted by hand.
 */
export function displayName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "Unnamed official";
}

/**
 * Renders a minute count at a scale a person can read at a glance.
 *
 * A backlog measured in minutes stops being legible fast — a report sitting
 * for nine days reads as "13242 min", which no one parses as over a week.
 * Minutes stay exact under an hour, where the difference actually matters
 * for triage.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainderMinutes = minutes % 60;
    return remainderMinutes === 0 ? `${hours}h` : `${hours}h ${remainderMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours === 0 ? `${days}d` : `${days}d ${remainderHours}h`;
}
// Philippine Standard Time, fixed at UTC+8 — the country observes no DST, so
// a constant offset is exact, not an approximation.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Midnight at the start of today in Manila, as an instant.
 *
 * Every "today" in this console means the officials' day, not the machine's.
 * Server code runs in whatever zone the host is set to (UTC once deployed),
 * and client code runs in whatever zone the official's laptop is set to;
 * `new Date().setHours(0, 0, 0, 0)` would give a different boundary in each,
 * and a UTC boundary rolls the day over at 8am Manila — mid-shift.
 *
 * Shared by the queue's [Validated today] count (server) and Validation
 * History's Today filter (client), so the two can never disagree about which
 * day a review belongs to. Takes `now` as a parameter only for testability.
 */
export function startOfManilaDay(now: number = Date.now()): Date {
  const shifted = now + MANILA_OFFSET_MS;
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - MANILA_OFFSET_MS);
}
