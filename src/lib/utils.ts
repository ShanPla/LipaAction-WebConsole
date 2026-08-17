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