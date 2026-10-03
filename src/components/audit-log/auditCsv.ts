import { translate, type MessageKey } from "@/lib/i18n";
import { manilaTimestamp, ownValue } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

/**
 * The barangay Audit Log as CSV rows, header first: the thesis's export of
 * the log for data-protection requests (A.3.7).
 *
 * Exactly the events on screen, filters included, as Validation History
 * exports its rows. English whatever the interface language, like every file
 * that leaves the console; each action also goes out as the trail's own
 * code, which is what the database holds. Times are exact and in Manila,
 * with the offset kept. No official is in it: the page has none to give.
 */
export function auditCsvRows(
  entries: AuditLogEntry[],
  actionLabels: Record<string, MessageKey>,
  roleLabels: Record<string, MessageKey>
): string[][] {
  const english = (labels: Record<string, MessageKey>, value: string): string => {
    const key = ownValue(labels, value);
    return key ? translate("en", key) : value;
  };
  return [
    ["Event ID", "When", "Action", "Action code", "Role", "Report ID", "Category"],
    ...entries.map((e) => [
      e.id,
      manilaTimestamp(e.at),
      english(actionLabels, e.action),
      e.action,
      english(roleLabels, e.actorRole),
      e.reportId ?? "",
      e.category ?? "",
    ]),
  ];
}
