// Shared by the Verify Resident page, its modals and its Server Actions. A
// "use server" file may export only async functions, so the constants the
// actions and the dialogs must agree on live here.

/**
 * How a resident's residency was established, as the backend's
 * attest_resident() accepts it. The thesis names the same three (A.3.9):
 * in person at the barangay hall, a field visit, and the barangay's own
 * records of long-time residents.
 */
export const ATTEST_METHODS = ["in_person", "field", "bulk_import"] as const;
export type AttestMethod = (typeof ATTEST_METHODS)[number];

export function isAttestMethod(value: unknown): value is AttestMethod {
  return typeof value === "string" && (ATTEST_METHODS as readonly string[]).includes(value);
}

// The backend takes a revoke reason of 1 to 500 characters after trimming.
// Checked in the dialog, in the action, and by the function itself.
export const MAX_REVOKE_REASON_LENGTH = 500;

export const RESIDENT_TIER_FILTERS = ["tier0", "tier1", "all"] as const;
export type ResidentTierFilter = (typeof RESIDENT_TIER_FILTERS)[number];
