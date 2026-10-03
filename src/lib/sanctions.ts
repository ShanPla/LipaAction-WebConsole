// Shared by the Sanctions page, its loader and its Server Action. Nothing
// here touches the database, so client components can import it.
import { ownValue } from "@/lib/utils";

// The backend takes a lift reason of 1 to 500 characters after trimming.
// Checked in the dialog, in the action, and by the function itself.
export const MAX_LIFT_REASON_LENGTH = 500;

export const SANCTION_TRACK_FILTERS = ["all", "inaccurate", "malicious"] as const;
export type SanctionTrackFilter = (typeof SANCTION_TRACK_FILTERS)[number];

/** The sanction columns of a resident's profile, as stored. */
export interface SanctionColumns {
  suspension_status: string | null;
  cooldown_until: string | null;
  cooldown_track: string | null;
}

export interface SanctionState {
  // A suspension stands until it is lifted; a cooldown ends on its own.
  kind: "suspension" | "cooldown";
  // The track the sanction itself is on: the suspension's when suspended,
  // otherwise the cooldown's. `inaccurate`, `malicious`, or the stored value
  // when it is neither, shown as itself.
  track: string;
  // True when the cooldown hasn't ended yet. A suspended resident can also
  // have one running.
  cooldownActive: boolean;
  // True when only a senior barangay admin may lift: anything on the
  // malicious track, which includes an inaccurate-track suspension with a
  // malicious-track cooldown still running. Anything this console can't
  // read as plainly inaccurate-track counts too: the backend has the last
  // word, and a button offered wrongly would only earn a refusal.
  seniorOnly: boolean;
}

const SUSPENSION_TRACKS: Record<string, string> = {
  "suspended-inaccurate": "inaccurate",
  "suspended-malicious": "malicious",
};

/**
 * Reads a resident's active sanction, or null when there is none. A cooldown
 * whose end has passed counts as none, as the backend counts it.
 */
export function readSanction(row: SanctionColumns, now: number): SanctionState | null {
  const suspension = row.suspension_status && row.suspension_status.trim() !== "" ? row.suspension_status : null;
  const ends = row.cooldown_until ? Date.parse(row.cooldown_until) : NaN;
  const cooldownActive = !Number.isNaN(ends) && ends > now;
  if (!suspension && !cooldownActive) return null;

  const suspensionOk = suspension === null || suspension === "suspended-inaccurate";
  const cooldownOk = !cooldownActive || row.cooldown_track === "inaccurate";
  return {
    kind: suspension ? "suspension" : "cooldown",
    // An own-key lookup: the stored value picks the label, and a value this
    // console doesn't know is shown as itself.
    track: suspension ? ownValue(SUSPENSION_TRACKS, suspension) ?? suspension : row.cooldown_track ?? "",
    cooldownActive,
    seniorOnly: !(suspensionOk && cooldownOk),
  };
}

