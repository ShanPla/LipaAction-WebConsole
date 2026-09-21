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

// Role names are interface text: see role.* in src/lib/messages.ts.

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
  // Sanitised on read as well as on write: profiles.full_name can also be set
  // by other surfaces sharing the project, or directly through PostgREST.
  const cleaned = sanitizeName(fullName ?? "");
  return cleaned.length > 0 ? cleaned : "Unnamed official";
}

// Characters that render as nothing, or reorder the text around them, but
// still make two names compare unequal: C0/C1 controls, soft hyphen, the
// zero-width family, bidirectional overrides and isolates, and the BOM. A
// display name is an identity on this console — it's the [Validating
// official] on every decision and in the CSV — so [Shan] and [Shan] with a
// zero-width space must not be two different people, and a right-to-left
// override must not be able to make a name read as someone else's.
const INVISIBLE_OR_REORDERING =
  /[\u0000-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/**
 * Normalises a person's display name: NFKC (so full-width and compatibility
 * forms collapse to one spelling), invisible and bidi characters removed,
 * runs of whitespace collapsed, ends trimmed. Pure and safe on any string.
 */
export function sanitizeName(name: string): string {
  return name.normalize("NFKC").replace(INVISIBLE_OR_REORDERING, "").replace(/\s+/g, " ").trim();
}

// Shape only — eight-four-four-four-twelve hex — not an RFC 4122 version
// check. Server Actions are public POST endpoints: a report id arrives as
// whatever the caller sent, and must be proven a string of this shape before
// it reaches a query, a log line, or a loop.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The longest rejection reason accepted — by the reject prompt's textarea and
// by updateReportStatus, which re-checks it because the action is a public
// endpoint. Stops a caller storing a megabyte of text as a reason.
export const MAX_REASON_LENGTH = 1000;

// The longest display name accepted, for the same two places.
export const MAX_NAME_LENGTH = 80;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_SHAPE.test(value);
}

/**
 * One CSV cell, safe to open in a spreadsheet.
 *
 * RFC 4180 quoting alone is not enough: Excel, LibreOffice and Sheets decide
 * formula-versus-text after unquoting, so a quoted cell that starts with
 * `=`, `+`, `-`, `@` (or a tab or carriage return, which some of them skip
 * first) is still evaluated. Three exported columns carry text other people
 * typed — the rejection reason, the validating official's display name, and
 * the category — so any of them could arrive as `=HYPERLINK(...)`. A leading
 * apostrophe makes the cell text in all three programs; the cost is that a
 * reason genuinely starting with a dash exports with an apostrophe in front.
 * Full-width lookalikes are included because NFKC-folding spreadsheets treat
 * them the same.
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const inert = /^[\t\r]|^\s*[=+\-@＝＋－＠]/.test(text) ? `'${text}` : text;
  return `"${inert.replace(/"/g, '""')}"`;
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

/**
 * Turns a category key into something readable: `medical_emergency` becomes
 * `Medical emergency`.
 *
 * incident_reports.category holds the canonical snake_case key — the same
 * value category_agency_routing is keyed on — so it reached every screen as
 * `crime_in_progress`. This is display only, and applied in the data modules
 * so that what an official searches, exports, and reads all agree. The raw
 * key is never lost: routeReport re-reads it from the database server-side,
 * so the agency lookup is unaffected by anything done here.
 *
 * Values that are already prose pass through with only their first letter
 * capitalised.
 */
export function categoryLabel(category: string): string {
  const words = category.trim().replace(/[_-]+/g, " ");
  if (words.length === 0) return "Uncategorised";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * An exact timestamp in Manila, keeping its offset: `2026-09-16T15:54:43+08:00`.
 *
 * For files that leave the console. Everything on screen is Manila (see
 * startOfManilaDay), but the CSV used to carry the raw column value, which
 * Supabase returns in UTC — so a row shown as 15:54 was exported as 07:54,
 * and a DPO reading the export would have put the access eight hours earlier
 * than the official who made it. Keeping the +08:00 offset means the value
 * is still unambiguous and still sorts correctly, unlike a bare local time.
 */
export function manilaTimestamp(isoString: string): string {
  const parsed = new Date(isoString);
  // An unparseable value passes through rather than becoming [Invalid Date].
  if (Number.isNaN(parsed.getTime())) return isoString;

  const shifted = new Date(parsed.getTime() + MANILA_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}+08:00`
  );
}
