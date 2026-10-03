import { translate, type MessageKey } from "@/lib/i18n";
import { manilaTimestamp, ownValue } from "@/lib/utils";
// Type-only imports from a server-only module — erased at compile time.
import type { AccessLogData, AccessLogEntry } from "@/lib/data/cityAccessLog";

/**
 * The city access log as CSV rows, header first: the thesis's RA 10173 Data
 * Access Log for data-protection requests (A.5.7).
 *
 * Exactly the events on screen: the kind and the dates chosen, up to the
 * page's limit. English whatever the interface language, like every file
 * that leaves the console, with each action also as the trail's own code,
 * which is what the database holds. Times are exact and in Manila, with the
 * offset kept.
 *
 * Officials by name, as the page shows them. A resident is never named here
 * either, and no account id is in the file: the only id is each event's own.
 *
 * The last column is what a console-written event adds, in the trail's own
 * names: which view of the log was opened, or what was exported and how
 * many rows.
 */
export function accessLogCsvRows(
  data: Pick<AccessLogData, "entries" | "namesUnavailable">,
  actionLabels: Record<string, MessageKey>,
  roleLabels: Record<string, MessageKey>
): string[][] {
  const english = (labels: Record<string, MessageKey>, value: string | null): string => {
    if (!value) return "";
    const key = ownValue(labels, value);
    return key ? translate("en", key) : value;
  };
  const who = ({ actor }: AccessLogEntry): string => {
    if (actor.kind === "resident") return "Resident, not named";
    if (actor.kind === "system") return "System, automatic";
    if (actor.kind === "notNamed") return "Not named";
    return actor.name ?? (data.namesUnavailable ? "Name unavailable" : "Unnamed official");
  };
  const office = ({ actor }: AccessLogEntry): string => {
    if (actor.kind !== "official" || actor.office === null) return "";
    return actor.office.type === "city" ? "Lipa City" : actor.office.name;
  };

  const detail = ({ detail }: AccessLogEntry): string => {
    if (!detail) return "";
    if (detail.type === "view") return `view: ${detail.filter}`;
    return detail.rows === null ? detail.what : `${detail.what}, ${detail.rows} rows`;
  };

  return [
    ["Event ID", "When", "Action", "Action code", "Official", "Role", "Office", "Report ID", "Category", "Detail"],
    ...data.entries.map((e) => [
      e.id,
      manilaTimestamp(e.at),
      english(actionLabels, e.action),
      e.action,
      who(e),
      english(roleLabels, e.actorRole),
      office(e),
      e.reportId ?? "",
      e.category ?? "",
      detail(e),
    ]),
  ];
}
