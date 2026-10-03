// Role checks that client components can import. auth.ts is server-only, so
// the sidebar and the admin pages' client halves read the role they were
// handed through these instead. They decide what a screen offers, nothing
// more: the database decides what a role may actually do.

/** barangay_admin and senior_barangay_admin: the roles the thesis gives
 *  Tier 1 verification and sanction lifts to (A.3). */
export function isBarangayAdminRole(role: string): boolean {
  return role === "barangay_admin" || role === "senior_barangay_admin";
}

/** The Punong Barangay's tier: revokes attestations and lifts malicious-track
 *  sanctions, which a barangay_admin cannot. */
export function isSeniorBarangayAdminRole(role: string): boolean {
  return role === "senior_barangay_admin";
}
