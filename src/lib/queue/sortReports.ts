import type { QueueReport } from "@/types";

export type QueueSort = "priority" | "newest" | "oldest";

export const QUEUE_SORTS: readonly QueueSort[] = ["priority", "newest", "oldest"];

export function isQueueSort(value: string): value is QueueSort {
  return (QUEUE_SORTS as readonly string[]).includes(value);
}

function createdMs(report: QueueReport): number {
  const ms = Date.parse(report.details.submittedAt);
  return Number.isNaN(ms) ? 0 : ms;
}

// The server's order: highest score first, unscored last, then longest
// waiting (oldest) first. Id is the final tie-break so the order is total.
function byPriority(a: QueueReport, b: QueueReport): number {
  const sa = a.details.priorityScore;
  const sb = b.details.priorityScore;
  if (sa !== sb) {
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa;
  }
  return createdMs(a) - createdMs(b) || a.id.localeCompare(b.id);
}

export function compareReports(sort: QueueSort): (a: QueueReport, b: QueueReport) => number {
  switch (sort) {
    case "newest":
      return (a, b) => createdMs(b) - createdMs(a) || byPriority(a, b);
    case "oldest":
      return (a, b) => createdMs(a) - createdMs(b) || byPriority(a, b);
    default:
      return byPriority;
  }
}

/** Returns a new array; never mutates the loaded list. */
export function sortReports(rows: readonly QueueReport[], sort: QueueSort): QueueReport[] {
  return [...rows].sort(compareReports(sort));
}
