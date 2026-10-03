import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, manilaDayStart, sanitizeName } from "@/lib/utils";
import { ACCESS_LOG_OPENED, KIND_ACTIONS, isAccessLogKind, type AccessLogKind } from "@/lib/accessLog";
import { DATA_EXPORTED } from "@/lib/exports";

/**
 * The city access log: who opened, decided on and routed each report, by
 * name. For the municipal administrator only, under the backend owner's
 * conditions of 2026-10-03:
 * - officials by name and role, never a raw user id;
 * - never a resident's or a report subject's identity;
 * - read-only;
 * - every opening of the page recorded.
 *
 * The barangay Audit Log can't name anyone: its read function returns no
 * actor. This page reads audit_logs directly, which audit_select_oversight
 * allows municipal_admin to do, so the column list below is the only thing
 * keeping the subject and the free-text reasons out. Nothing may add to it.
 */
const AUDIT_COLUMNS = "id, created_at, action, actor_id, actor_role, report_id";
// Not subject_user_id (the resident whose data was viewed), not reason (a
// free-text rejection reason can name anyone), not purpose_code, and not
// metadata, with one exception that has its own query: see loadDetails().

// The two actions whose metadata this page reads. Both are written by a
// console through log_audit, in a shape the backend fixes ({ filter } for an
// opening of this log, { what, rows } for an export), and neither can hold a
// person. Every other event's metadata stays unread.
const DETAIL_ACTIONS = [ACCESS_LOG_OPENED, DATA_EXPORTED];
// The backend caps both texts at 64 characters. Cleaned and capped again
// here, because they are shown and exported.
const MAX_DETAIL_LENGTH = 64;

const LIMIT = 200;
// Ids per .in() request: they travel in the URL, and 200 uuids in one would
// pass 7 kB.
const ID_CHUNK = 100;

// The roles this page names. Officials only: a resident who appears as the
// actor of an event is shown by role, never by name. An unknown role isn't
// named either, until someone decides it should be.
const BARANGAY_ROLES = new Set(["barangay_official", "barangay_admin", "senior_barangay_admin"]);
const AGENCY_ROLES = new Set(["agency_user", "agency_supervisor"]);
const CITY_ROLES = new Set(["municipal_admin", "dpo"]);
const NAMED_ROLES = new Set([...BARANGAY_ROLES, ...AGENCY_ROLES, ...CITY_ROLES]);

/** Where a named official works, as their profile says now. */
export type AccessLogOffice = { type: "barangay" | "agency"; name: string } | { type: "city" };

export type AccessLogActor =
  // name null: the profile has none, or the names couldn't be read (see
  // AccessLogData.namesUnavailable). office null: not recorded or not readable.
  | { kind: "official"; name: string | null; office: AccessLogOffice | null }
  | { kind: "resident" }
  // Written by the database itself, with no actor (an automatic routing).
  | { kind: "system" }
  // A role this page doesn't name.
  | { kind: "notNamed" };

/**
 * What an event a console wrote says besides who and when: which view of
 * this log was opened, or what was exported and how many rows. Both texts
 * are the trail's own names, shown as themselves when this console doesn't
 * know them.
 */
export type AccessLogDetail =
  | { type: "view"; filter: string }
  // rows null: the record carried no usable count.
  | { type: "export"; what: string; rows: number | null };

export interface AccessLogEntry {
  id: string; // the audit row's own id: render key, never a person
  timestamp: string; // Manila
  at: string; // the same moment as an ISO instant, for the export
  action: string; // free text: an unknown action renders as itself
  actorRole: string | null; // the role recorded with the event
  actor: AccessLogActor;
  reportId: string | null;
  category: string | null;
  // Only on an opening of this log and on an export; null on every other event.
  detail: AccessLogDetail | null;
}

export interface AccessLogData {
  // Unique to this server render, so the page can tell a fresh render from a
  // copy the browser's router cache shows again without asking the server.
  renderId: string;
  kind: AccessLogKind;
  // The Manila days the list is narrowed to, both ends included, as proven
  // from the URL. Null for an open end.
  from: string | null;
  to: string | null;
  entries: AccessLogEntry[];
  summary: { events: number; openings: number; decisions: number; officials: number };
  limit: number;
  capped: boolean;
  namesUnavailable: boolean;
  // Set when the opening couldn't be recorded. Nothing was read then.
  logFailure: "session" | "failed" | null;
  loadFailed: boolean;
}

interface RawAuditRow {
  id: string;
  created_at: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  report_id: string | null;
}

type Supabase = ReturnType<typeof createClient>;

/**
 * Records that this administrator opened the access log, then reads it.
 *
 * One function, so no caller can read without recording: if log_audit
 * refuses or fails, nothing is read and the page shows nothing. That is the
 * opposite of a report drawer, which stays open when its view can't be
 * logged, because a desk must never be locked out of an emergency.
 * Withholding an access log costs nobody anything, and showing it unrecorded
 * would defeat it.
 *
 * The kind arrives from the URL, so it is proven here: anything that isn't
 * one of ACCESS_LOG_KINDS reads as [all]. So do the two days of the date
 * range (thesis A.5.7, the audit window of a data-protection request): a
 * value that isn't a real day is no bound, and a range given backwards is
 * read the way it was meant.
 */
export async function openCityAccessLog(
  requestedKind: string | undefined,
  requestedFrom?: unknown,
  requestedTo?: unknown
): Promise<AccessLogData> {
  const kind: AccessLogKind = isAccessLogKind(requestedKind) ? requestedKind : "all";
  const range = resolveRange(requestedFrom, requestedTo);
  const supabase = createClient();
  const base = {
    renderId: randomUUID(),
    kind,
    from: range.from,
    to: range.to,
    entries: [],
    summary: { events: 0, openings: 0, decisions: 0, officials: 0 },
    limit: LIMIT,
    capped: false,
    namesUnavailable: false,
  };

  // 1. Record the opening. The kind goes with it, so the trail says which
  // view was looked at. The dates don't: the backend accepts a filter of the
  // console's kinds and nothing else.
  const { error: logError, status } = await supabase.rpc("log_audit", {
    p_action: ACCESS_LOG_OPENED,
    p_report_id: null,
    p_metadata: { filter: kind },
  });
  if (logError) {
    // 401 means no session reached PostgREST; PGRST30x is a bad or expired
    // token. Anything else is a refusal or an outage: either way, nothing is
    // shown. Structured fields only in the log, never the message.
    const expired = status === 401 || (logError.code ?? "").startsWith("PGRST30");
    console.error("[city-access-log] opening not recorded", JSON.stringify({ code: logError.code, status }));
    return { ...base, logFailure: expired ? "session" : "failed", loadFailed: false };
  }

  // 2. Read. Newest first; id breaks ties, since created_at is transaction
  // time and one transaction can write several rows.
  let query = supabase
    .from("audit_logs")
    .select(AUDIT_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LIMIT);
  if (kind === "other") {
    const listed = Object.values(KIND_ACTIONS).flat();
    query = query.not("action", "in", `(${listed.join(",")})`);
  } else if (kind !== "all") {
    query = query.in("action", [...KIND_ACTIONS[kind]]);
  }
  if (range.start !== null) query = query.gte("created_at", new Date(range.start).toISOString());
  if (range.end !== null) query = query.lt("created_at", new Date(range.end).toISOString());

  const { data, error } = await query;
  if (error || !data) {
    console.error("[city-access-log] load failed", error?.code, error?.message);
    return { ...base, logFailure: null, loadFailed: true };
  }
  const rows = data as RawAuditRow[];

  // Names only for officials. A resident's id never leaves this function in a
  // query, let alone to the page.
  const officialIds = unique(
    rows.filter((r) => r.actor_id && r.actor_role && NAMED_ROLES.has(r.actor_role)).map((r) => r.actor_id as string)
  );
  const [people, categories, details] = await Promise.all([
    loadPeople(supabase, officialIds),
    loadCategories(supabase, unique(rows.map((r) => r.report_id).filter((id): id is string => id !== null))),
    loadDetails(supabase, rows.filter((r) => DETAIL_ACTIONS.includes(r.action)).map((r) => r.id)),
  ]);

  const entries = rows.map(
    (r): AccessLogEntry => ({
      id: r.id,
      timestamp: formatEventTime(r.created_at),
      at: r.created_at,
      action: r.action,
      actorRole: r.actor_role,
      actor: actorOf(r, people),
      reportId: r.report_id,
      category: r.report_id ? categories.get(r.report_id) ?? null : null,
      detail: details.get(r.id) ?? null,
    })
  );

  return {
    ...base,
    entries,
    summary: {
      events: entries.length,
      openings: entries.filter((e) => KIND_ACTIONS.openings.includes(e.action)).length,
      decisions: entries.filter((e) => KIND_ACTIONS.decisions.includes(e.action)).length,
      // Counted by account, not by name: officials choose their own display
      // names, and two may share one.
      officials: officialIds.length,
    },
    capped: rows.length === LIMIT,
    namesUnavailable: people.namesUnavailable,
    logFailure: null,
    loadFailed: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The date range as two proven Manila days and the instants they bound:
 * `start` is the first moment of `from`, `end` the first moment after `to`.
 */
function resolveRange(
  rawFrom: unknown,
  rawTo: unknown
): { from: string | null; to: string | null; start: number | null; end: number | null } {
  let from = manilaDayStart(rawFrom) === null ? null : (rawFrom as string);
  let to = manilaDayStart(rawTo) === null ? null : (rawTo as string);
  if (from !== null && to !== null && from > to) [from, to] = [to, from];
  const start = manilaDayStart(from);
  const lastDay = manilaDayStart(to);
  return { from, to, start, end: lastDay === null ? null : lastDay + DAY_MS };
}

function actorOf(row: RawAuditRow, people: People): AccessLogActor {
  const role = row.actor_role?.trim() || null;
  if (!role && !row.actor_id) return { kind: "system" };
  if (role === "resident") return { kind: "resident" };
  if (!role || !NAMED_ROLES.has(role)) return { kind: "notNamed" };

  const person = row.actor_id ? people.byId.get(row.actor_id) : undefined;
  let office: AccessLogOffice | null = null;
  if (CITY_ROLES.has(role)) office = { type: "city" };
  else if (person && BARANGAY_ROLES.has(role) && person.barangayId) {
    const name = people.barangays.get(person.barangayId);
    office = name ? { type: "barangay", name } : null;
  } else if (person && AGENCY_ROLES.has(role) && person.agencyId) {
    const name = people.agencies.get(person.agencyId);
    office = name ? { type: "agency", name } : null;
  }
  return { kind: "official", name: person?.name ?? null, office };
}

interface Person {
  name: string | null;
  barangayId: string | null;
  agencyId: string | null;
}

interface People {
  byId: Map<string, Person>;
  barangays: Map<string, string>;
  agencies: Map<string, string>;
  namesUnavailable: boolean;
}

/**
 * Names and offices of the officials in these events. The office columns are
 * read apart from the names, so a problem with one can't cost the other.
 * Never phone, never role: the role shown is the one recorded with the event.
 */
async function loadPeople(supabase: Supabase, ids: string[]): Promise<People> {
  const empty: People = { byId: new Map(), barangays: new Map(), agencies: new Map(), namesUnavailable: false };
  if (ids.length === 0) return empty;

  const chunks = chunk(ids);
  const [names, offices, barangaysRes, agenciesRes] = await Promise.all([
    Promise.all(chunks.map((c) => supabase.from("profiles").select("id, full_name, barangay_id").in("id", c))),
    Promise.all(chunks.map((c) => supabase.from("profiles").select("id, agency_id").in("id", c))),
    supabase.from("barangays").select("id, name").limit(500),
    supabase.from("agencies").select("id, name").limit(500),
  ]);

  const namesFailed = names.find((r) => r.error || !r.data);
  if (namesFailed) {
    // Unknown, not absent: the page says [Name unavailable], never [Unnamed].
    console.error("[city-access-log] names failed", namesFailed.error?.code, namesFailed.error?.message);
    return { ...empty, namesUnavailable: true };
  }
  const officesFailed = offices.find((r) => r.error || !r.data);
  if (officesFailed) {
    console.error("[city-access-log] agency links failed", officesFailed.error?.code, officesFailed.error?.message);
  }
  if (barangaysRes.error) console.error("[city-access-log] barangays failed", barangaysRes.error.code, barangaysRes.error.message);
  if (agenciesRes.error) console.error("[city-access-log] agencies failed", agenciesRes.error.code, agenciesRes.error.message);

  const agencyOf = new Map<string, string | null>();
  if (!officesFailed) {
    for (const r of offices.flatMap((res) => (res.data ?? []) as { id: string; agency_id: string | null }[])) {
      agencyOf.set(r.id, r.agency_id);
    }
  }

  const byId = new Map<string, Person>();
  for (const r of names.flatMap((res) => (res.data ?? []) as { id: string; full_name: string | null; barangay_id: string | null }[])) {
    const cleaned = sanitizeName(r.full_name ?? "");
    byId.set(r.id, { name: cleaned || null, barangayId: r.barangay_id, agencyId: agencyOf.get(r.id) ?? null });
  }

  return {
    byId,
    barangays: namedMap(barangaysRes.data),
    agencies: namedMap(agenciesRes.data),
    namesUnavailable: false,
  };
}

/**
 * Categories for the reports these events touch, read from the reports
 * themselves. A failure costs only the category line.
 */
async function loadCategories(supabase: Supabase, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const results = await Promise.all(
    chunk(ids).map((c) => supabase.from("incident_reports").select("id, category").in("id", c))
  );
  const failed = results.find((r) => r.error || !r.data);
  if (failed) {
    console.error("[city-access-log] categories failed", failed.error?.code, failed.error?.message);
    return new Map();
  }
  return new Map(
    results.flatMap((r) => (r.data ?? []) as { id: string; category: string }[]).map((r) => [r.id, categoryLabel(r.category)])
  );
}

/**
 * The metadata of the events in DETAIL_ACTIONS, and of no other. The query
 * names the two actions as well as the ids, so what keeps every other
 * event's metadata unread is in the request itself, not only in which ids
 * were picked above. A failure costs only the detail line.
 */
async function loadDetails(supabase: Supabase, ids: string[]): Promise<Map<string, AccessLogDetail>> {
  const details = new Map<string, AccessLogDetail>();
  if (ids.length === 0) return details;
  const results = await Promise.all(
    chunk(ids).map((c) =>
      supabase.from("audit_logs").select("id, action, metadata").in("id", c).in("action", DETAIL_ACTIONS)
    )
  );
  const failed = results.find((r) => r.error || !r.data);
  if (failed) {
    console.error("[city-access-log] details failed", failed.error?.code, failed.error?.message);
    return details;
  }
  for (const r of results.flatMap((res) => (res.data ?? []) as { id: string; action: string; metadata: unknown }[])) {
    const detail = readDetail(r.action, r.metadata);
    if (detail) details.set(r.id, detail);
  }
  return details;
}

const detailText = (value: unknown): string =>
  typeof value === "string" ? sanitizeName(value).slice(0, MAX_DETAIL_LENGTH) : "";

/**
 * One event's metadata as a detail, or null when it isn't in the shape the
 * backend fixes for that action. Nothing else in the object is passed on.
 */
function readDetail(action: string, metadata: unknown): AccessLogDetail | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const fields = metadata as Record<string, unknown>;
  if (action === ACCESS_LOG_OPENED) {
    const filter = detailText(fields.filter);
    return filter ? { type: "view", filter } : null;
  }
  if (action === DATA_EXPORTED) {
    const what = detailText(fields.what);
    if (!what) return null;
    const rows = fields.rows;
    return { type: "export", what, rows: typeof rows === "number" && Number.isInteger(rows) && rows >= 0 ? rows : null };
  }
  return null;
}

function namedMap(rows: unknown): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of (rows ?? []) as { id: string; name: string | null }[]) {
    const name = r.name?.trim();
    if (name) map.set(r.id, name);
  }
  return map;
}

function chunk(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
  return out;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Manila, like every other time on the console. */
function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
