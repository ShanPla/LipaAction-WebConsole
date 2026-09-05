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